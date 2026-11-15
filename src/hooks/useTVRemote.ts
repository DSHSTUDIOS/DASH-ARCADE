"use client";

import { useEffect, useRef } from "react";
import { enableSound } from "@/lib/sound";

const arrows: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};
const numbered: Record<number, string> = {
  4: "Back",
  19: "ArrowUp",
  20: "ArrowDown",
  21: "ArrowLeft",
  22: "ArrowRight",
  23: "DPadCenter",
  66: "Enter",
};
const selector =
  'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]';

function targets() {
  const root =
    document.querySelector('[aria-modal="true"]') ??
    document.querySelector(".host-shell");
  return root
    ? [...root.querySelectorAll<HTMLElement>(selector)].filter(
        (el) =>
          el.tabIndex >= 0 &&
          el.getClientRects().length &&
          !el.closest("[inert],[hidden]") &&
          getComputedStyle(el).visibility !== "hidden",
      )
    : [];
}
function defaultTarget(list: HTMLElement[]) {
  return list.find((el) => el.hasAttribute("data-tv-default")) ?? list[0];
}
function focus(target: HTMLElement | undefined) {
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: "instant",
  });
}

export function useTVRemote(
  screen: string,
  onBack: () => boolean,
  blocked = false,
) {
  const back = useRef(onBack);
  const used = useRef(false);
  useEffect(() => {
    back.current = onBack;
  }, [onBack]);
  useEffect(() => {
    if (!used.current || blocked) return;
    const frame = requestAnimationFrame(() => focus(defaultTarget(targets())));
    return () => cancelAnimationFrame(frame);
  }, [screen, blocked]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      void enableSound();
      if (
        blocked ||
        document.querySelector(".boot-splash") ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      const key =
        !event.key || event.key === "Unidentified"
          ? numbered[event.keyCode]
          : event.key;
      if (
        ["Escape", "Back", "BrowserBack", "GoBack", "Backspace"].includes(key)
      ) {
        if (back.current()) event.preventDefault();
        return;
      }
      const direction = arrows[key];
      if (
        !direction &&
        !["Enter", "DPadCenter", "DPAD_CENTER", "Accept", "Select"].includes(
          key,
        )
      )
        return;
      used.current = true;
      const list = targets();
      const active = document.activeElement as HTMLElement | null;
      if (!active || !list.includes(active)) {
        event.preventDefault();
        focus(defaultTarget(list));
        return;
      }
      if (!direction) {
        if (
          !event.repeat &&
          !["SELECT", "INPUT", "TEXTAREA"].includes(active.tagName)
        ) {
          event.preventDefault();
          active.click();
        }
        return;
      }
      if (
        ["SELECT", "INPUT", "TEXTAREA"].includes(active.tagName) &&
        direction[1]
      )
        return;
      event.preventDefault();
      const rect = active.getBoundingClientRect();
      const [dx, dy] = direction;
      const candidates = list
        .flatMap((el) => {
          if (el === active) return [];
          const bounds = el.getBoundingClientRect();
          const x = (bounds.left + bounds.right - rect.left - rect.right) / 2;
          const y = (bounds.top + bounds.bottom - rect.top - rect.bottom) / 2;
          const distance = x * dx + y * dy;
          if (distance <= 3) return [];
          const offset = Math.abs(x * dy - y * dx);
          return [{ el, weight: distance + offset * 2.25 }];
        })
        .sort((a, b) => a.weight - b.weight);
      focus(candidates[0]?.el);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [blocked]);
}
