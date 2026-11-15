"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { useEffect, useState } from "react";

type Playback = {
  granted: boolean;
  title?: string;
  artist?: string;
  playing?: boolean;
  canSkip?: boolean;
};

export const tvMusic = registerPlugin<{
  nowPlaying(): Promise<Playback>;
  skip(): Promise<void>;
  openSpotify(): Promise<void>;
  openAccessSettings(): Promise<void>;
}>("TvMusic");

export function useTvMusic() {
  const [available, setAvailable] = useState(false);
  const [playback, setPlayback] = useState<Playback>();
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("TvMusic"))
      return;
    setAvailable(true);
    let cancelled = false;
    let checking = false;
    async function update() {
      if (document.hidden || checking) return;
      checking = true;
      try {
        const next = await tvMusic.nowPlaying();
        if (!cancelled) {
          setPlayback((previous) =>
            previous?.granted === next.granted &&
            previous?.title === next.title &&
            previous?.artist === next.artist &&
            previous?.playing === next.playing &&
            previous?.canSkip === next.canSkip
              ? previous
              : next,
          );
        }
      } catch {
        if (!cancelled) setPlayback(undefined);
      } finally {
        checking = false;
      }
    }
    void update();
    const timer = window.setInterval(update, 1500);
    document.addEventListener("visibilitychange", update);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return { available, playback };
}
