"use client";

import { useRef, useState } from "react";
import JellyAvatar, { shapeNames } from "./JellyAvatar";
import {
  ArrowLeft,
  Gamepad2,
  Headphones,
  Palette,
  Users,
  Vote,
} from "./ArcadeIcons";
import { ModuleLabel } from "./HubUI";
import { tracks } from "./HostAudio";
import { enableSound, playEffect } from "@/lib/sound";
import { COLORS, type Effect } from "@/lib/types";

const soundBank: [Effect, string][] = [
  ["boot", "Boot"],
  ["join", "Join"],
  ["tick", "Tick"],
  ["dice", "Dice"],
  ["coin", "Coin"],
  ["card", "Cards"],
  ["gavel", "Gavel"],
  ["victory", "Fanfare"],
];
const engines = [
  {
    icon: Vote,
    title: "Prompt & Vote",
    copies: "Quiplash Clash, Fibbage Lies, Split the Room",
  },
  { icon: Palette, title: "Canvas Mashup", copies: "Tee K.O. Brawl" },
  {
    icon: Users,
    title: "Deduction & Trivia",
    copies: "Fakin’ It, Trivia Dungeon",
  },
];

export default function Credits({
  onBack,
  muted,
}: {
  onBack: () => void;
  muted: boolean;
}) {
  const player = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<number>();
  function audition(index: number) {
    const audio = player.current;
    if (!audio) return;
    if (track === index && !audio.paused) {
      audio.pause();
      setTrack(undefined);
      return;
    }
    audio.src = tracks[index].file;
    audio.volume = 0.22;
    setTrack(index);
    void audio.play().catch(() => setTrack(undefined));
  }
  return (
    <section className="credits-scene">
      <button
        type="button"
        data-tv-default
        className="secondary"
        onClick={onBack}
      >
        <ArrowLeft size={20} /> Back to arcade
      </button>
      <div className="credits-banner panel">
        <div>
          <ModuleLabel icon={<Gamepad2 size={22} />}>
            CREDITS / V2.0
          </ModuleLabel>
          <h1>
            Made by
            <br />
            Pratik Dash.
          </h1>
          <p>Designed, engineered &amp; built by Pratik Dash.</p>
        </div>
        <JellyAvatar
          shapeId={15}
          color="#ff5ca8"
          expressionId={20}
          reaction="winner"
          size={190}
        />
      </div>
      <div className="credits-roll" aria-label="Arcade credits">
        <div>
          <span>CREATOR · PRATIK DASH</span>
          <span>PARTY MUSIC · KEVIN MACLEOD</span>
          <span>11 GAMES · 48 JELLY SHAPES</span>
          <span aria-hidden="true">CREATOR · PRATIK DASH</span>
          <span aria-hidden="true">PARTY MUSIC · KEVIN MACLEOD</span>
          <span aria-hidden="true">11 GAMES · 48 JELLY SHAPES</span>
        </div>
      </div>
      <div className="credits-decks">
        <section className="panel credit-module">
          <h2>Game engines</h2>
          {engines.map(({ icon: Icon, title, copies }) => (
            <div className="credit-engine" key={title}>
              <Icon size={34} />
              <div>
                <h3>{title}</h3>
                <p>{copies}</p>
              </div>
            </div>
          ))}
        </section>
        <section className="panel credit-module">
          <ModuleLabel icon={<Headphones size={21} />}>JUKEBOX</ModuleLabel>
          <h2>Sound test</h2>
          <div className="credits-buttons">
            {soundBank.map(([effect, name]) => (
              <button
                className="secondary"
                disabled={muted}
                key={effect}
                onClick={() =>
                  void enableSound().then(() => playEffect(effect))
                }
              >
                {name}
              </button>
            ))}
          </div>
          <audio
            ref={player}
            muted={muted}
            onEnded={() => setTrack(undefined)}
          />
          <div className="credits-tracks">
            {tracks.map((song, index) => (
              <div key={song.title}>
                <button
                  className="secondary"
                  aria-pressed={track === index}
                  onClick={() => audition(index)}
                >
                  {track === index ? "Stop" : "Play"} · {song.title}
                </button>
                <a href={song.source} target="_blank" rel="noreferrer">
                  Source
                </a>
              </div>
            ))}
          </div>
          <p>
            Tracks by Kevin MacLeod ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
          </p>
        </section>
      </div>
      <section className="panel credit-module">
        <h2>The Jelly parade</h2>
        <div className="jelly-parade">
          {shapeNames.map((name, i) => (
            <div
              key={name}
              style={{ "--parade-delay": `${-i / 5}s` } as React.CSSProperties}
            >
              <JellyAvatar
                shapeId={i + 1}
                color={COLORS[i % COLORS.length][1]}
                expressionId={(i % 20) + 1}
                size={76}
              />
              <small>{name}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
