"use client";

import { Headphones, Volume2, VolumeX } from "@/components/ArcadeIcons";
import { useEffect, useRef, useState } from "react";
import { enableSound, playEffect } from "@/lib/sound";
import type { HubState } from "@/lib/types";

export const tracks = [
  {
    title: "Pixel Peeker Polka – faster",
    file: "/music/pixel-peeker.mp3",
    source:
      "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100833",
  },
  {
    title: "Bit Quest",
    file: "/music/bit-quest.mp3",
    source:
      "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500073",
  },
  {
    title: "Hyperfun",
    file: "/music/hyperfun.mp3",
    source:
      "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400038",
  },
];

export default function HostAudio({
  sound,
  countdown,
  muted,
  onMute,
}: {
  sound?: HubState["sound"];
  countdown: number;
  muted: boolean;
  onMute: () => void;
}) {
  const [song, setSong] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const soundId = useRef<number | undefined>(undefined);
  const lastTick = useRef(0);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (sound && soundId.current !== sound.id && !muted)
      playEffect(sound.effect);
    soundId.current = sound?.id;
  }, [sound, muted]);
  useEffect(() => {
    if (
      !muted &&
      countdown > 0 &&
      countdown <= 10 &&
      countdown !== lastTick.current
    )
      playEffect("tick");
    lastTick.current = countdown;
  }, [countdown, muted]);
  useEffect(() => {
    if (audio.current) audio.current.volume = 0.22;
  }, []);
  function toggleMusic() {
    const player = audio.current;
    if (!player) return;
    enableSound();
    if (player.paused) {
      setError(false);
      void player.play().catch(() => setError(true));
    } else player.pause();
  }
  return (
    <div className="audio-controls">
      <audio
        ref={audio}
        src={tracks[song].file}
        muted={muted}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setError(true)}
      />
      <details className="music-menu">
        <summary className="icon-button" aria-label="Party music">
          <Headphones size={19} />
        </summary>
        <div className="panel music-popover">
          <h3>Party music</h3>
          <select
            value={song}
            aria-label="Soundtrack"
            onChange={(e) => {
              const next = Number(e.target.value),
                player = audio.current;
              setSong(next);
              setError(false);
              if (player && !player.paused) {
                player.src = tracks[next].file;
                void player.play().catch(() => setError(true));
              }
            }}
          >
            {tracks.map(({ title }, index) => (
              <option key={title} value={index}>
                {title}
              </option>
            ))}
          </select>
          <button className="secondary" onClick={toggleMusic}>
            {playing ? "Pause" : "Play music"}
          </button>
          {error && <small>Track couldn’t play. Try another selection.</small>}
          <small>
            Music by Kevin MacLeod ·{" "}
            <a href={tracks[song].source} target="_blank" rel="noreferrer">
              Track credits
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
          </small>
        </div>
      </details>
      <button
        className="icon-button"
        aria-label={muted ? "Unmute sound" : "Mute sound"}
        title={muted ? "Unmute sound" : "Mute sound"}
        aria-pressed={muted}
        onClick={() => {
          enableSound();
          onMute();
        }}
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </div>
  );
}
