"use client";

import { useEffect, useRef } from "react";
import { enableSound } from "@/lib/sound";

const vertical: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };
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
          (!el.closest("details:not([open])") || el.tagName === "SUMMARY") &&
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
    behavior: "auto",
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
      const horizontal =
        key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
      const dy = vertical[key];
      if (
        !horizontal &&
        !dy &&
        !["Enter", "DPadCenter", "DPAD_CENTER", "Accept", "Select"].includes(
          key,
        )
      )
        return;
      used.current = true;
      const list = targets();
      const active = document.activeElement as HTMLElement | null;
      if (!list.length) return;
      const index = active ? list.indexOf(active) : -1;
      if (horizontal) {
        event.preventDefault();
        const next =
          index < 0
            ? horizontal === 1
              ? 0
              : list.length - 1
            : (index + horizontal + list.length) % list.length;
        focus(list[next]);
        return;
      }
      if (!active || index < 0) {
        event.preventDefault();
        focus(defaultTarget(list));
        return;
      }
      if (!dy) {
        if (
          !event.repeat &&
          !["SELECT", "INPUT", "TEXTAREA"].includes(active.tagName)
        ) {
          event.preventDefault();
          active.click();
        }
        return;
      }
      if (["SELECT", "INPUT", "TEXTAREA"].includes(active.tagName)) return;
      event.preventDefault();
      const rect = active.getBoundingClientRect();
      const candidates = list
        .flatMap((el) => {
          if (el === active) return [];
          const bounds = el.getBoundingClientRect();
          const x = (bounds.left + bounds.right - rect.left - rect.right) / 2;
          const y = (bounds.top + bounds.bottom - rect.top - rect.bottom) / 2;
          const distance = y * dy;
          if (distance <= 3) return [];
          const offset = Math.abs(x);
          return [{ el, weight: distance + offset * 2.25 }];
        })
        .sort((a, b) => a.weight - b.weight);
      const next = candidates[0]?.el;
      if (next) focus(next);
      else if (dy) {
        const main = document.querySelector<HTMLElement>(".host-main");
        if (main && main.scrollHeight > main.clientHeight) {
          main.scrollBy({
            top: dy * main.clientHeight * 0.7,
            behavior: "auto",
          });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [blocked]);
}
