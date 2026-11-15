"use client";

import { Headphones, Volume2, VolumeX } from "@/components/ArcadeIcons";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { tvMusic, useTvMusic } from "@/lib/useTvMusic";
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
  {
    title: "Electrodoodle",
    file: "/music/electrodoodle.mp3",
    source:
      "https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1200079",
  },
  {
    title: "Pinball Spring 160",
    file: "/music/pinball-spring-160.mp3",
    source:
      "https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100742",
  },
  {
    title: "Fluffing a Duck",
    file: "/music/fluffing-a-duck.mp3",
    source:
      "https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100768",
  },
];

const musicPreference = "dash-arcade-music";

export default function HostAudio({
  sound,
  countdown,
  muted,
  onMute,
  suspended,
  onOpenJam,
  jamPending,
  jamActive,
}: {
  sound?: HubState["sound"];
  countdown: number;
  muted: boolean;
  onMute: () => void;
  suspended: boolean;
  onOpenJam: () => void;
  jamPending: boolean;
  jamActive: boolean;
}) {
  const { available: spotifyAvailable, playback: spotify } = useTvMusic();
  const [spotifyError, setSpotifyError] = useState("");
  const musicSuspended = suspended || Boolean(spotify?.playing);
  async function spotifyAction(action: "openSpotify" | "openAccessSettings" | "skip") {
    setSpotifyError("");
    try {
      await tvMusic[action]();
    } catch (error) {
      setSpotifyError(error instanceof Error ? error.message : "Spotify is unavailable on this TV.");
    }
  }
  const [song, setSong] = useState(0);
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(musicPreference) !== "paused";
    } catch {
      return true;
    }
  });
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const soundId = useRef<number | undefined>(undefined);
  const lastTick = useRef(0);
  const audio = useRef<HTMLAudioElement>(null);
  const advancedTrack = useRef<number | undefined>(undefined);
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
    const player = audio.current;
    if (!player) return;
    player.volume = 0.16;
    if (!enabled || musicSuspended) {
      player.pause();
      return;
    }
    function syncPlayback() {
      if (!player) return;
      if (document.hidden) player.pause();
      else if (player.paused)
        void player.play().catch((reason) => {
          if (
            reason instanceof DOMException &&
            ["NotAllowedError", "AbortError"].includes(reason.name)
          )
            return;
          setError(true);
        });
    }
    syncPlayback();
    window.addEventListener("keydown", syncPlayback, true);
    window.addEventListener("pointerdown", syncPlayback, true);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      window.removeEventListener("keydown", syncPlayback, true);
      window.removeEventListener("pointerdown", syncPlayback, true);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [enabled, song, musicSuspended]);

  function advanceTrack(player: HTMLAudioElement) {
    if (
      advancedTrack.current === song ||
      !player.currentSrc.endsWith(tracks[song].file)
    )
      return;
    advancedTrack.current = song;
    setError(false);
    setSong((index) => (index + 1) % tracks.length);
  }

  function toggleMusic() {
    const player = audio.current;
    if (!player || musicSuspended) return;
    const next = !playing;
    setEnabled(next);
    try {
      localStorage.setItem(musicPreference, next ? "playing" : "paused");
    } catch {
      /* Playback still works without storage. */
    }
    if (!next) player.pause();
    else {
      setError(false);
      void player.play().catch(() => setError(true));
    }
  }
  return (
    <div className="audio-controls">
      <audio
        ref={audio}
        src={tracks[song].file}
        muted={muted}
        onLoadedMetadata={() => {
          advancedTrack.current = undefined;
        }}
        onEnded={(event) => advanceTrack(event.currentTarget)}
        onTimeUpdate={(event) => {
          const player = event.currentTarget;
          if (
            !player.paused &&
            !player.seeking &&
            Number.isFinite(player.duration) &&
            player.duration > 1 &&
            player.duration - player.currentTime < 0.07
          )
            advanceTrack(player);
        }}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setError(true)}
      />
      {spotify?.title && (
        <NowPlaying
          track={[spotify.title, spotify.artist].filter(Boolean).join(" · ")}
          playing={Boolean(spotify.playing)}
        />
      )}
      <details className="music-menu">
        <summary className="icon-button" aria-label="Party music">
          <Headphones size={19} />
          {jamPending && <b className="jam-indicator" aria-label="Spotify invite waiting">•</b>}
        </summary>
        <div className="panel music-popover">
          <h3>Party music</h3>
          {spotifyAvailable && (
            <div className="spotify-tv-controls">
              <button className="secondary" onClick={() => void spotifyAction("openSpotify")}>
                Open Spotify on TV
              </button>
              {spotify?.granted === false && (
                <>
                  <button className="secondary" onClick={() => void spotifyAction("openAccessSettings")}>
                    Enable Spotify Now Playing
                  </button>
                  <small>Android requires Notification access. Dash Arcade only reads Spotify’s track title and artist through Android media controls.</small>
                </>
              )}
              {spotify?.granted && !spotify.title && <small>Start a song in Spotify to see it here.</small>}
              {spotify?.canSkip && (
                <button className="secondary" onClick={() => void spotifyAction("skip")}>
                  Skip Spotify track
                </button>
              )}
              {spotifyError && <small role="alert">{spotifyError}</small>}
            </div>
          )}
          <select
            value={song}
            aria-label="Soundtrack"
            onChange={(e) => {
              setSong(Number(e.target.value));
              setError(false);
            }}
          >
            {tracks.map(({ title }, index) => (
              <option key={title} value={index}>
                {title}
              </option>
            ))}
          </select>
          <button
            className="secondary"
            onClick={toggleMusic}
            disabled={musicSuspended}
          >
            {playing ? "Pause" : "Play music"}
          </button>
          <button
            className="subtle"
            onClick={() => {
              setError(false);
              setSong((value) => (value + 1) % tracks.length);
            }}
          >
            Next track
          </button>
          <button
            className="secondary"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              onOpenJam();
            }}
          >
            {jamPending ? "Spotify Jam · Invite waiting" : jamActive ? "Spotify Jam · On" : "Spotify Jam"}
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

function NowPlaying({ track, playing }: { track: string; playing: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const frame = viewport.current;
    const text = line.current;
    if (!frame || !text) return;
    const measure = () =>
      setOverflow(Math.max(0, Math.ceil(text.scrollWidth - frame.clientWidth)));
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(text);
    measure();
    return () => observer.disconnect();
  }, [track]);

  return (
    <div className="spotify-now-playing" title={track}>
      <small>{playing ? "Spotify · Now playing" : "Spotify · Paused"}</small>
      <div className="spotify-track-window" ref={viewport}>
        <strong
          key={track}
          ref={line}
          data-scroll={overflow > 1}
          style={{
            "--track-overflow": `-${overflow}px`,
            "--track-duration": `${Math.max(7, (overflow * 2) / 30 + 4)}s`,
          } as CSSProperties}
        >
          {track}
        </strong>
      </div>
    </div>
  );
}
