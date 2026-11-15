"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowDownToLine, Smartphone } from "./ArcadeIcons";

type InstallEvent = Event & {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPromptModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [platform, setPlatform] = useState<"ios" | "android">();
  const [safari, setSafari] = useState(false);
  const [request, setRequest] = useState<InstallEvent>();
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const native = (
      window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.();
    if (
      native ||
      nav.standalone ||
      matchMedia("(display-mode: standalone)").matches
    )
      return;
    if (
      /iPhone|iPad|iPod/i.test(nav.userAgent) ||
      (nav.platform === "MacIntel" && nav.maxTouchPoints > 1)
    ) {
      setPlatform("ios");
      setSafari(
        /Safari/i.test(nav.userAgent) &&
          !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(nav.userAgent),
      );
    } else if (/Android/i.test(nav.userAgent)) {
      setPlatform("android");
    }
    const capture = (event: Event) => {
      event.preventDefault();
      setRequest(event as InstallEvent);
    };
    const complete = () => {
      setInstalled(true);
      dialog.current?.close();
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);

  if ((!platform && !request) || installed) return null;
  return (
    <div className="install-strip">
      <button className="secondary" onClick={() => dialog.current?.showModal()}>
        <ArrowDownToLine size={19} /> Install Dash Arcade
      </button>
      <dialog
        ref={dialog}
        className="panel install-dialog"
        aria-labelledby="install-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="controller-stack">
          <h2 id="install-title">Add Dash Arcade to your Home Screen</h2>
          {platform === "ios" && !safari && (
            <p>Open this same page in Safari first.</p>
          )}
          <ol className="install-steps">
            <li>
              <span>1</span>
              <Smartphone size={32} />
              <b>{platform === "ios" ? "Tap Share" : "Open Chrome’s ⋮ menu"}</b>
            </li>
            <li>
              <span>2</span>
              <ArrowDownToLine size={32} />
              <b>
                {platform === "ios"
                  ? "Tap Add to Home Screen, then Add"
                  : "Tap Install app or Add to Home screen"}
              </b>
            </li>
          </ol>
          <div className="actions">
            <button
              className="secondary"
              onClick={() => dialog.current?.close()}
            >
              Close
            </button>
            {request && (
              <button
                className="primary"
                onClick={async () => {
                  try {
                    const result = await request.prompt();
                    if (result.outcome === "accepted") {
                      setInstalled(true);
                      dialog.current?.close();
                    }
                  } catch {
                    // The browser menu remains available if the install event has expired.
                  } finally {
                    setRequest(undefined);
                  }
                }}
              >
                Install app <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
