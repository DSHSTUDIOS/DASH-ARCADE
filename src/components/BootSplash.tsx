"use client";

import { useEffect, useState } from "react";
import { Gamepad2 } from "./ArcadeIcons";
import { enableSound, playEffect } from "@/lib/sound";

export default function BootSplash() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 2500);
    let played = false;
    function audio(event: Event) {
      if (!event.isTrusted || played) return;
      played = true;
      void enableSound().then(() => playEffect("boot"));
    }
    window.addEventListener("pointerdown", audio);
    window.addEventListener("keydown", audio);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("pointerdown", audio);
      window.removeEventListener("keydown", audio);
    };
  }, []);
  return visible ? (
    <div className="boot-splash" aria-label="Dash Arcade startup" role="status">
      <div className="boot-hardware">
        <div className="boot-cartridge">
          <Gamepad2 size={67} />
          <div>
            <b>DASH</b>
            <span>ARCADE SYSTEM</span>
          </div>
        </div>
        <div className="boot-socket" />
        <div className="boot-leds" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h1>DASH ARCADE OS // V2.0</h1>
        <p>DESIGNED, ENGINEERED &amp; BUILT BY PRATIK DASH</p>
        <div className="boot-progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  ) : null;
}
