"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Gamepad2,
  Radio,
  Smartphone,
  Vote,
} from "@/components/ArcadeIcons";
import { useEffect, useRef, useState } from "react";
import BootSplash from "@/components/BootSplash";
import InstallPromptModal from "@/components/InstallPromptModal";
import AvatarStudio from "@/components/AvatarStudio";
import JellyAvatar from "@/components/JellyAvatar";
import JamInviteForm from "@/components/JamInviteForm";
import { spotifyInvite, spotifyTop100, spotifyGlobal50 } from "@/lib/spotifyJam";
import {
  Brand,
  ModuleLabel,
  ranked,
  Signature,
  VotingCards,
} from "@/components/HubUI";
import { findPlayer, PlayerBadge, Timer } from "@/components/GameUI";
import RoomStatus from "@/components/RoomStatus";
import { registry } from "@/games/registry";
import { gameColor } from "@/games/types";
import { usePartyRoom, type CanvasMessage } from "@/lib/usePartyRoom";
import { useClock } from "@/lib/useClock";
import {
  cleanPlayer,
  COLORS,
  type GameChoice,
  type HubView,
  type Player,
  type Stroke,
} from "@/lib/types";

const storageKey = "party_arcade_controller";
type Join = { code: string; player: Player };
const starter = { shapeId: 3, color: COLORS[8][1], expressionId: 1 } as const;

function useScreenWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return;
    let current: WakeLockSentinel | undefined,
      stopped = false,
      request = false;
    async function lock() {
      if (
        stopped ||
        request ||
        (current && !current.released) ||
        document.visibilityState !== "visible"
      )
        return;
      request = true;
      try {
        const wake = await navigator.wakeLock.request("screen");
        if (stopped) await wake.release();
        else current = wake;
      } catch {
        /* Wake lock availability depends on the browser and power state. */
      } finally {
        request = false;
      }
    }
    void lock();
    document.addEventListener("visibilitychange", lock);
    window.addEventListener("focus", lock);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", lock);
      window.removeEventListener("focus", lock);
      if (current && !current.released) void current.release();
    };
  }, [active]);
}

export default function PlayPage() {
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState<Join>();
  const [error, setError] = useState("");
  useEffect(() => {
    const fromLink = new URL(location.href).searchParams
      .get("room")
      ?.toUpperCase();
    if (fromLink && /^[A-Z]{4}$/.test(fromLink)) setCode(fromLink);
    try {
      const previous = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "null",
      ) as Join | null;
      if (
        !previous ||
        !/^[A-Z]{4}$/.test(previous.code) ||
        (fromLink && fromLink !== previous.code)
      )
        return;
      const player = cleanPlayer(previous.player, previous.player?.id);
      if (player && /^[a-f0-9-]{36}$/i.test(player.id)) {
        setJoined({ code: previous.code, player });
        setNickname(player.name);
        setCode(previous.code);
      }
    } catch {
      /* Ignore corrupt or unavailable tab storage. */
    }
  }, []);
  useEffect(() => {
    if (joined) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(joined));
      } catch {
        /* Play can continue without a saved controller. */
      }
    }
  }, [joined]);
  useScreenWakeLock(Boolean(joined));
  return (
    <div className="page-shell phone-shell">
      <BootSplash />
      <header className="topbar">
        <div className="host-brand">
          <Brand />
          <Signature />
        </div>
        {joined && (
          <div className="topbar-right">
            <span className="header-room">
              <b>ROOM</b> {joined.code}
            </span>
          </div>
        )}
      </header>
      <main className="phone-main">
        <InstallPromptModal />
        {joined ? (
          <Controller
            key={joined.code}
            join={joined}
            onChange={(player) => setJoined({ ...joined, player })}
            onLeave={() => {
              try {
                sessionStorage.removeItem(storageKey);
              } catch {}
              setJoined(undefined);
            }}
          />
        ) : (
          <section className="panel phone-panel join-panel">
            <ModuleLabel icon={<Smartphone size={16} />}>
              PHONE CONTROLLER
            </ModuleLabel>
            <h1>Join the party.</h1>
            <p>Enter the four letters on the TV and pick a nickname.</p>
            <form
              className="controller-stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^[A-Z]{4}$/.test(code) || !nickname.trim()) return;
                if (!globalThis.crypto?.randomUUID) {
                  setError("Open the arcade over HTTPS or localhost to join.");
                  return;
                }
                setError("");
                setJoined({
                  code,
                  player: {
                    id: crypto.randomUUID(),
                    name: nickname.trim().slice(0, 18),
                    avatar: starter,
                    ready: false,
                  },
                });
              }}
            >
              <label htmlFor="join-code">Room code</label>
              <input
                className="code-input"
                id="join-code"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z]/g, "")
                      .slice(0, 4),
                  )
                }
                placeholder="ABCD"
                maxLength={4}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                required
              />
              <label htmlFor="nickname">Nickname</label>
              <input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your party name"
                maxLength={18}
                autoComplete="nickname"
                required
              />
              {error && (
                <p role="alert" className="notice">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="primary"
                disabled={code.length !== 4 || !nickname.trim()}
              >
                Continue <ArrowRight size={18} />
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

function Controller({
  join,
  onChange,
  onLeave,
}: {
  join: Join;
  onChange: (player: Player) => void;
  onLeave: () => void;
}) {
  const [room, setRoom] = useState<HubView>();
  const [inviteSent, setInviteSent] = useState(false);
  const [musicSetup] = useState(
    () => typeof location !== "undefined" && new URLSearchParams(location.search).get("music") === "spotify",
  );
  const [hostOffset, setHostOffset] = useState(0);
  const [ink, setInk] = useState<{ key: string; strokes: Stroke[] }>();
  const inkRef = useRef<{ key: string; strokes: Stroke[] } | undefined>(
    undefined,
  );
  const { player, code } = join;
  const now = useClock() - hostOffset;
  const { status, peers, sendAction } = usePartyRoom(
    code,
    "player",
    player.id,
    player,
    {
      onSync(next) {
        if (next.code === code) {
          if (next.sentAt) setHostOffset(Date.now() - next.sentAt);
          setRoom(next);
        }
      },
      onCanvas({ key, batch }: CanvasMessage) {
        const old = inkRef.current;
        const strokes =
          batch === "clear"
            ? []
            : [...(old?.key === key ? old.strokes : []), ...batch].slice(-1200);
        inkRef.current = { key, strokes };
        setInk(inkRef.current);
      },
    },
  );
  const hostOnline = peers.some((peer) => peer.role === "host");
  const active =
    hostOnline &&
    (status === "local" || status === "live") &&
    room?.online.includes(player.id);
  const send = (type: string, value?: unknown) => {
    if (!room || !active) return;
    sendAction(room.epoch, { type, value });
  };
  const game = room?.game && registry[room.game.id];
  const jamUrl = spotifyInvite(room?.spotifyJam);
  const jamPanel = room && hostOnline &&
    (status === "local" || status === "live") &&
    (active || musicSetup) &&
    room.players.some((member) => member.id === player.id) ? (
    <section className="panel phone-jam">
      {jamUrl && (
        <a className="primary" href={jamUrl} target="_blank" rel="noreferrer">
          Join Spotify Jam · Add songs
        </a>
      )}
      <details open={musicSetup || undefined}>
        <summary>{jamUrl ? "Spotify playlists" : "Spotify Jam"}</summary>
        <div className="actions">
          <a className="secondary" href={spotifyTop100} target="_blank" rel="noreferrer">Top 100 all-time</a>
          <a className="subtle" href={spotifyGlobal50} target="_blank" rel="noreferrer">Today’s Global Top 50</a>
        </div>
        {!jamUrl && (
          <JamInviteForm
            submitLabel="Send invite to the TV"
            onInvite={(url) => {
              sendAction(room.epoch, { type: "spotify-jam-invite", value: url });
              setInviteSent(true);
            }}
          />
        )}
        {inviteSent && !jamUrl && <small role="status">The host can approve the invite from Party music.</small>}
      </details>
    </section>
  ) : null;
  return (
    <>
      <div className="phone-meta">
        <button className="subtle" onClick={onLeave}>
          <ArrowLeft size={16} /> Leave room
        </button>
        <RoomStatus status={status} />
      </div>
      {musicSetup && jamPanel}
      {!player.ready ? (
        <AvatarStudio
          avatar={player.avatar}
          onChange={(avatar) => onChange({ ...player, avatar })}
          onReady={() => onChange({ ...player, ready: true })}
        />
      ) : !room || !hostOnline || (!active && room.phase !== "PODIUM") ? (
        <section className="panel phone-panel waiting">
          <JellyAvatar {...player.avatar} size={116} />
          <h1>
            {hostOnline && room && !room.players.some((p) => p.id === player.id)
              ? "The room is full."
              : "Looking for the TV…"}
          </h1>
          <p>
            {status === "local"
              ? "Local mode links tabs in the same browser. To join from a phone, use a Supabase-enabled room."
              : "Check the room code and keep the host screen open."}
          </p>
          <span className="pill">
            <Radio size={15} /> Room {code}
          </span>
        </section>
      ) : (
        <>
          {room.phase === "LOBBY" && (
            <section className="panel phone-panel waiting">
              <ModuleLabel icon={<Check size={16} />}>
                READY TO PLAY
              </ModuleLabel>
              <JellyAvatar {...player.avatar} size={150} reaction="happy" />
              <h1>You’re in, {player.name}.</h1>
              <p>Game night starts when everyone is ready.</p>
            </section>
          )}
          {(room.phase === "VOTING" || room.phase === "ROULETTE") && (
            <section className="panel phone-panel phone-voting">
              <div className="split">
                <ModuleLabel icon={<Vote size={15} />}>VOTING HUB</ModuleLabel>
                <Timer deadline={room.deadline} now={now || Date.now()} />
              </div>
              <h1>
                {room.phase === "VOTING"
                  ? "Pick the next game."
                  : "It’s a tie!"}
              </h1>
              <p>
                {room.phase === "VOTING"
                  ? room.votes[player.id]
                    ? "Vote sent. You can change it before the room locks in."
                    : "Your vote appears on the TV."
                  : "Check the TV for the tie-breaker."}
              </p>
              {room.phase === "VOTING" && (
                <VotingCards
                  room={room}
                  me={player.id}
                  onVote={(choice: GameChoice) => send("vote", choice)}
                />
              )}
              <div className="phone-points">
                <PlayerBadge
                  player={player}
                  detail={`${room.points[player.id] ?? 0} hub points`}
                />
              </div>
            </section>
          )}
          {room.phase === "GAME" && (
            <section
              className="panel phone-panel phone-game"
              style={game ? gameColor(game.accent) : undefined}
            >
              {game && room.game ? (
                <>
                  <ModuleLabel icon={<game.icon size={16} />}>
                    {game.title.toUpperCase()}
                  </ModuleLabel>
                  <game.Phone
                    key={room.epoch}
                    data={room.game.data}
                    room={room}
                    now={now || Date.now()}
                    me={player.id}
                    send={send}
                    canvas={ink}
                  />
                </>
              ) : (
                <>
                  <ModuleLabel icon={<Gamepad2 size={16} />}>
                    IN PROGRESS
                  </ModuleLabel>
                  <h1>You’re up next.</h1>
                  <p>Join the next game when voting opens again.</p>
                </>
              )}
            </section>
          )}
          {room.phase === "CREDITS" && (
            <section className="panel phone-panel waiting">
              <ModuleLabel icon={<Gamepad2 size={16} />}>CREDITS</ModuleLabel>
              <h1>Made by Pratik Dash.</h1>
              <p>The credits are rolling on the TV.</p>
            </section>
          )}
          {room.phase === "PODIUM" && (
            <section className="panel phone-panel waiting">
              <ModuleLabel icon={<Crown size={16} />}>GRAND FINALE</ModuleLabel>
              <h1>
                {findPlayer(room, ranked(room)[0])?.name ?? "Game night"}{" "}
                {ranked(room).length ? "wins!" : "is over!"}
              </h1>
              <div className="phone-rankings">
                {ranked(room)
                  .slice(0, 3)
                  .map((id, i) => (
                    <PlayerBadge
                      key={id}
                      player={findPlayer(room, id)}
                      reaction={i === 0 ? "winner" : "happy"}
                      detail={`#${i + 1} · ${room.points[id] ?? 0} points`}
                    />
                  ))}
              </div>
              <p>You finished with {room.points[player.id] ?? 0} hub points.</p>
            </section>
          )}
        </>
      )}
      {!musicSetup && jamPanel}
    </>
  );
}
