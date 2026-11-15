"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Crown,
  Flag,
  Gamepad2,
  Smartphone,
  Users,
  Vote,
} from "@/components/ArcadeIcons";
import Link from "next/link";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brand,
  Leaderboard,
  ModuleLabel,
  Podium,
  Signature,
  VotingCards,
} from "@/components/HubUI";
import { PlayerBadge, Timer } from "@/components/GameUI";
import RoomStatus from "@/components/RoomStatus";
import BootSplash from "@/components/BootSplash";
import Credits from "@/components/Credits";
import { useTVRemote } from "@/hooks/useTVRemote";
import HostAudio from "@/components/HostAudio";
import { spotifyInvite } from "@/lib/spotifyJam";
import JellyAvatar from "@/components/JellyAvatar";
import { registry } from "@/games/registry";
import { gameColor, secondsLeft } from "@/games/types";
import {
  choices,
  closeCredits,
  launch,
  lockVote,
  onGameComplete,
  openCredits,
  openRoom,
  podium,
  ROOM_CAP,
  roomKey,
  toView,
  voting,
  VOTE_TIME,
} from "@/lib/hub";
import { enableSound } from "@/lib/sound";
import { useClock } from "@/lib/useClock";
import { usePartyRoom } from "@/lib/usePartyRoom";
import {
  cleanPlayer,
  type Action,
  type GameChoice,
  type HubState,
} from "@/lib/types";

export default function HostPage() {
  const [session, setSession] = useState<ReturnType<typeof openRoom>>();
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      setSession(openRoom());
    } catch {
      setError(
        "The host needs HTTPS or localhost and browser storage enabled.",
      );
    }
  }, []);
  return (
    <>
      <BootSplash />
      {session ? (
        <Host
          key={session.state.code}
          initial={session.state}
          id={session.id}
        />
      ) : (
        <main className="page-shell">
          <Brand />
          <div className="panel wait-panel">
            <h2>{error || "Opening your arcade…"}</h2>
            <Link href="/" className="subtle">
              <ArrowLeft size={16} /> Home
            </Link>
          </div>
        </main>
      )}
    </>
  );
}

function Host({ initial, id }: { initial: HubState; id: string }) {
  const [state, setState] = useState(initial);
  const [online, setOnline] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [qr, setQr] = useState("");
  const [saveProblem, setSaveProblem] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const [jamOpen, setJamOpen] = useState(false);
  const [jamProposal, setJamProposal] = useState<{ player: string; url: string }>();
  const jamUrl = spotifyInvite(state.spotifyJam);
  const jamQrTarget = jamUrl || (joinUrl && `${joinUrl}&music=spotify`);
  const [jamQr, setJamQr] = useState<{ url: string; image: string }>();
  useEffect(() => {
    if (!jamOpen || !jamQrTarget) return;
    let cancelled = false;
    void QRCode.toDataURL(jamQrTarget, { width: 360, margin: 4 })
      .then((image) => {
        if (!cancelled) setJamQr({ url: jamQrTarget, image });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [jamOpen, jamQrTarget]);
  function shareJam(url?: string) {
    commit({ ...latest.current, spotifyJam: url });
    setJamProposal(undefined);
  }
  const latest = useRef(state);
  const connected = useRef(online);
  const dirty = useRef(true);
  const diskDirty = useRef(true);
  const canvasRelay = useRef<ReturnType<typeof usePartyRoom>["relayCanvas"]>(
    () => {},
  );
  const [autoStartAt, setAutoStartAt] = useState(0);
  const now = useClock(
    state.phase === "ROULETTE" ? 90 : 250,
    state.phase === "ROULETTE" ||
      state.phase === "VOTING" ||
      state.phase === "GAME" ||
      autoStartAt > 0,
  );
  const readyRoster = online.join(",");
  const allLobbyPlayersReady =
    online.length >= 2 && state.players.every((player) => player.ready);
  useEffect(() => {
    if (state.phase !== "LOBBY" || endConfirm || !allLobbyPlayersReady) {
      setAutoStartAt(0);
      return;
    }
    const timer = setTimeout(() => {
      const current = latest.current;
      if (
        current.phase === "LOBBY" &&
        connected.current.length >= 2 &&
        current.players.every((player) => player.ready)
      ) {
        commit(voting(current, Date.now()));
      }
    }, 3000);
    setAutoStartAt(Date.now() + 3000);
    return () => clearTimeout(timer);
  }, [state.phase, endConfirm, allLobbyPlayersReady, readyRoster]);
  const code = state.code;

  function commit(next: HubState, onlyCanvas = false) {
    if (next === latest.current) return;
    latest.current = next;
    diskDirty.current = true;
    if (!onlyCanvas) dirty.current = true;
    setState(next);
  }

  useTVRemote(jamOpen ? `SPOTIFY-${Boolean(jamUrl)}` : state.phase + endConfirm, () => {
    if (jamOpen) {
      setJamOpen(false);
      return true;
    }
    if (endConfirm) {
      setEndConfirm(false);
      return true;
    }
    if (latest.current.phase === "CREDITS") {
      commit(closeCredits(latest.current, Date.now()));
      return true;
    }
    const music =
      document.querySelector<HTMLDetailsElement>(".music-menu[open]");
    if (music) {
      music.open = false;
      return true;
    }
    return false;
  });

  function updateGame(
    current: HubState,
    time: number,
    action?: Action & { player: string },
  ) {
    if (
      !current.game ||
      !connected.current.some((player) => current.participants.includes(player))
    )
      return;
    const plugin = registry[current.game.id];
    const outcome = plugin.step(
      current.game.data,
      { now: time, ids: current.participants, online: connected.current },
      action,
    );
    if (outcome.rankings) {
      commit(onGameComplete(current, outcome.rankings, time));
      return;
    }
    if (outcome.data === current.game.data && !outcome.effect) return;
    if (outcome.stroke && action) {
      const prefix = `${current.epoch}:`;
      const gameData = outcome.data as { turn?: number };
      const key =
        current.game.id === "guess-sketch"
          ? prefix + gameData.turn
          : prefix + (action.value as { id: number }).id;
      const toIds =
        current.game.id === "guess-sketch"
          ? current.participants.filter((pid) => pid !== action.player)
          : [action.player];
      canvasRelay.current(
        toIds
          .filter((pid) => connected.current.includes(pid))
          .map((to) => ({ to, body: { key, batch: outcome.stroke! } })),
      );
    }
    commit(
      {
        ...current,
        game: { id: current.game.id, data: outcome.data },
        sound: outcome.effect
          ? { id: (current.sound?.id ?? 0) + 1, effect: outcome.effect }
          : current.sound,
      },
      !!outcome.stroke,
    );
  }

  const { status, peers, sync, relayCanvas } = usePartyRoom(
    code,
    "host",
    id,
    undefined,
    {
      onAction(player, epoch, action) {
        const current = latest.current;
        if (action.type === "spotify-jam-invite") {
          const url = spotifyInvite(action.value);
          if (
            url &&
            url !== current.spotifyJam &&
            current.players.some((member) => member.id === player)
          ) {
            setJamProposal((pending) => pending ?? { player, url });
          }
          return;
        }
        if (current.epoch !== epoch || !connected.current.includes(player)) return;
        if (
          current.phase === "VOTING" &&
          Date.now() < current.deadline &&
          action.type === "vote" &&
          choices.includes(action.value as GameChoice)
        ) {
          commit({
            ...current,
            votes: { ...current.votes, [player]: action.value as GameChoice },
          });
        }
        if (current.phase === "GAME" && current.participants.includes(player))
          updateGame(current, Date.now(), { ...action, player });
      },
    },
  );
  useEffect(() => {
    canvasRelay.current = relayCanvas;
  }, [relayCanvas]);
  useEffect(() => {
    const playerProfiles = peers
      .filter((p) => p.role === "player")
      .flatMap((p) => {
        const player = cleanPlayer(p.player, p.id);
        return player ? [player] : [];
      });
    const current = latest.current;
    const merged = [...current.players];
    let added = false;
    for (const profile of playerProfiles) {
      const index = merged.findIndex((person) => person.id === profile.id);
      if (index === -1 && merged.length < ROOM_CAP) {
        merged.push(profile);
        added ||= profile.ready;
      }
      if (index !== -1) {
        added ||= !merged[index].ready && profile.ready;
        merged[index] = profile;
      }
    }
    // Unready profiles who leave in the lobby can release their room slot.
    const accepted = merged.filter(
      (player) =>
        current.phase !== "LOBBY" ||
        player.ready ||
        playerProfiles.some((profile) => profile.id === player.id),
    );
    const ids = accepted
      .filter(
        (player) =>
          player.ready &&
          playerProfiles.some((profile) => profile.id === player.id),
      )
      .map((player) => player.id);
    connected.current = ids;
    setOnline(ids);
    dirty.current = true;
    if (JSON.stringify(accepted) !== JSON.stringify(current.players)) {
      commit({
        ...current,
        players: accepted,
        sound: added
          ? { id: (current.sound?.id ?? 0) + 1, effect: "join" }
          : current.sound,
      });
    }
  }, [peers]);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = latest.current;
      const time = Date.now(),
        ids = connected.current;
      if (
        current.phase === "VOTING" &&
        (time >= current.deadline ||
          (ids.length >= 2 && ids.every((player) => current.votes[player])))
      ) {
        commit(lockVote(current, ids, time));
      }
      if (
        current.phase === "ROULETTE" &&
        time >= current.deadline &&
        current.selected
      )
        commit(launch(current, current.selected, ids, time));
      if (current.phase === "GAME") updateGame(current, time);
    }, 120);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function save() {
      if (!diskDirty.current) return;
      try {
        localStorage.setItem(roomKey(code), JSON.stringify(latest.current));
        diskDirty.current = false;
        setSaveProblem(false);
      } catch {
        setSaveProblem(true);
      }
    }
    save();
    const timer = setInterval(save, 320);
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [code]);

  useEffect(() => {
    let lastSync = 0;
    const timer = setInterval(() => {
      const time = Date.now();
      if (!dirty.current && time - lastSync < 5000) return;
      const current = latest.current;
      const recipients = peers.filter((p) => p.role === "player");
      if (!recipients.length) return;
      dirty.current = false;
      lastSync = time;
      sync(
        recipients.slice(0, ROOM_CAP).map((peer) => ({
          to: peer.id,
          body: {
            ...toView(current, connected.current, peer.id),
            sentAt: time,
          },
        })),
      );
    }, 160);
    return () => clearInterval(timer);
  }, [peers, sync]);

  useEffect(() => {
    const link = new URL(
      "/play/",
      process.env.NEXT_PUBLIC_ARCADE_ORIGIN || location.origin,
    );
    link.searchParams.set("room", code);
    setJoinUrl(link.href);
    void QRCode.toDataURL(link.href, {
      width: 240,
      margin: 2,
      color: { dark: "#1b1132", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => {});
  }, [code]);

  const copyInvite = useCallback(async () => {
    enableSound();
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1700);
    } catch {
      setCopied(false);
    }
  }, [joinUrl]);

  const room = useMemo(() => toView(state, online), [state, online]);
  const voters = online.filter((pid) => state.votes[pid]).length;
  const eligible =
    state.phase === "LOBBY"
      ? state.players.filter((p) => online.includes(p.id) || !p.ready)
      : state.players;
  const currentGame = room.game && registry[room.game.id];
  const flashIndex = state.roulette.length
    ? Math.max(0, Math.floor((2850 - (state.deadline - now)) / 155))
    : 0;
  const choice =
    state.phase === "ROULETTE"
      ? state.deadline - now < 650
        ? state.selected
        : state.roulette[flashIndex % state.roulette.length]
      : undefined;
  return (
    <div
      className="page-shell host-shell"
      data-phase={state.phase.toLowerCase()}
      onPointerDownCapture={enableSound}
    >
      <header className="topbar">
        <div className="host-brand">
          <Brand />
          <Signature />
        </div>
        <div className="topbar-right">
          <span className="header-room">
            <b>ROOM</b> {code}
          </span>
          <RoomStatus status={status} />
          <HostAudio
            suspended={Boolean(jamUrl) || state.phase === "CREDITS"}
            onOpenJam={() => setJamOpen(true)}
            jamPending={Boolean(jamProposal)}
            jamActive={Boolean(jamUrl)}
            muted={muted}
            onMute={() => setMuted((value) => !value)}
            sound={state.sound}
            countdown={
              state.phase === "VOTING"
                ? secondsLeft(state.deadline, now || Date.now())
                : 0
            }
          />
          {["LOBBY", "VOTING", "PODIUM"].includes(state.phase) && (
            <button
              className="secondary credits-entry"
              onClick={() => commit(openCredits(latest.current, Date.now()))}
            >
              Credits
            </button>
          )}
          {state.phase !== "PODIUM" && state.phase !== "CREDITS" && (
            <button
              className="secondary end-night"
              onClick={() => setEndConfirm(true)}
            >
              <Flag size={16} /> <span>End night</span>
            </button>
          )}
        </div>
      </header>
      {saveProblem && (
        <p className="notice">
          Browser storage is full or unavailable. Reload recovery may be
          incomplete.
        </p>
      )}
      {status === "secure-context-required" && (
        <p className="notice">
          Open the arcade over HTTPS or localhost to connect controllers.
        </p>
      )}
      <main className="host-main">
        {state.phase === "LOBBY" && (
          <>
            <div className="lobby-heading" data-counting={autoStartAt > 0}>
              <ModuleLabel icon={<Gamepad2 size={15} />}>
                HOST LOBBY
              </ModuleLabel>
              <h1>Game night starts here.</h1>
              <p>Join from your phone, pick a Jelly, and ready up.</p>
            </div>
            <div className="lobby-layout">
              <section className="panel invite-panel">
                <div>
                  <ModuleLabel icon={<Smartphone size={16} />}>
                    JOIN ON YOUR PHONE
                  </ModuleLabel>
                  <div className="invite-code" aria-label={`Room code ${code}`}>
                    {[...code].map((letter, i) => (
                      <span key={i}>{letter}</span>
                    ))}
                  </div>
                  <button className="secondary" onClick={copyInvite}>
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                    {copied ? "Link copied" : "Copy invite link"}
                  </button>
                </div>
                {qr && (
                  <img
                    className="qr"
                    src={qr}
                    width={153}
                    height={153}
                    alt="Scan to open this room’s phone controller"
                  />
                )}
                {status === "local" && (
                  <small>
                    Local mode · Open the join link in another tab of this
                    browser.
                  </small>
                )}
              </section>
              <section className="panel roster-panel">
                <div className="split">
                  <ModuleLabel icon={<Users size={15} />}>
                    THE PARTY
                  </ModuleLabel>
                  <span className="pill">
                    {online.length} / {ROOM_CAP} ready
                  </span>
                </div>
                {eligible.length ? (
                  <div className="roster-grid">
                    {eligible.map((player) => (
                      <div
                        key={player.id}
                        className="roster-avatar"
                        data-ready={player.ready && online.includes(player.id)}
                      >
                        <PlayerBadge
                          player={player}
                          size={72}
                          detail={
                            player.ready
                              ? online.includes(player.id)
                                ? "Ready!"
                                : "Away"
                              : "Customizing"
                          }
                          reaction={player.ready ? "happy" : "idle"}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="roster-empty">
                    <JellyAvatar
                      shapeId={8}
                      color="#a678fb"
                      expressionId={18}
                      size={82}
                    />
                    <p>Waiting for the first Jelly…</p>
                  </div>
                )}
              </section>
            </div>
            <div className="lobby-actions">
              <label className="deck-picker">
                <span>Crazy Cards deck</span>
                <select
                  value={state.spicy ? "unhinged" : "family"}
                  onChange={(e) =>
                    commit({
                      ...latest.current,
                      spicy: e.target.value === "unhinged",
                    })
                  }
                >
                  <option value="family">Family Chaos (PG-13)</option>
                  <option value="unhinged">Unhinged</option>
                </select>
              </label>
              <div>
                <button
                  data-tv-default
                  className="primary"
                  disabled={online.length < 2}
                  onClick={() => commit(voting(latest.current, Date.now()))}
                >
                  Start Game Night <ArrowRight size={19} />
                </button>
                <small role="status" className="lobby-status">
                  {autoStartAt && now
                    ? `Starting in ${Math.min(3, Math.max(1, secondsLeft(autoStartAt, now)))}…`
                    : online.length < 2
                      ? "2 ready players needed"
                      : ""}
                </small>
              </div>
            </div>
          </>
        )}
        {(state.phase === "VOTING" || state.phase === "ROULETTE") && (
          <div className="vote-layout">
            <section className="voting">
              <div className="split voting-top">
                <ModuleLabel icon={<Vote size={16} />}>VOTING HUB</ModuleLabel>
                <Timer
                  deadline={state.deadline}
                  now={now || Date.now()}
                  duration={state.phase === "VOTING" ? 60 : 3}
                />
              </div>
              <h1>
                {state.phase === "ROULETTE" ? "Tie-breaker!" : "What’s next?"}
              </h1>
              <p>
                {state.phase === "ROULETTE"
                  ? "The arcade is picking from the tied votes."
                  : "Vote on your phone. Everyone’s vote locks it in."}
              </p>
              <VotingCards room={room} active={choice} />
              <footer className="split vote-footer">
                <span className="vote-completion">
                  <span>{voters} / {online.length} votes in</span>
                  <span className="vote-completion-track" aria-hidden="true">
                    <i style={{ transform: `scaleX(${online.length ? voters / online.length : 0})` }} />
                  </span>
                </span>
                {state.phase === "VOTING" && (
                  <button
                    data-tv-default
                    className="subtle"
                    disabled={online.length < 2}
                    onClick={() =>
                      commit(
                        lockVote(latest.current, connected.current, Date.now()),
                      )
                    }
                  >
                    Lock vote <ChevronRight size={16} />
                  </button>
                )}
              </footer>
            </section>
            <Leaderboard room={room} />
          </div>
        )}
        {state.phase === "GAME" && currentGame && room.game && (
          <section
            className="active-game"
            style={gameColor(currentGame.accent)}
          >
            <div key={state.epoch} className="active-game-title">
              <div className="game-card-icon">
                <currentGame.icon size={27} />
              </div>
              <div>
                <span className="eyebrow">{currentGame.category}</span>
                <h1>{currentGame.title}</h1>
              </div>
            </div>
            <currentGame.TV
              key={state.epoch}
              data={room.game.data}
              room={room}
              me=""
              now={now || Date.now()}
              send={() => {}}
            />
          </section>
        )}
        {state.phase === "CREDITS" && (
          <Credits
            muted={muted}
            onBack={() => commit(closeCredits(latest.current, Date.now()))}
          />
        )}
        {state.phase === "PODIUM" && (
          <Podium
            room={room}
            onNew={() => {
              window.location.assign(window.location.pathname);
            }}
          />
        )}
      </main>
      {jamOpen && (
        <div className="dialog-backdrop" onClick={() => setJamOpen(false)}>
          <section
            className="panel jam-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jam-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="split">
              <h2 id="jam-title">Spotify Jam</h2>
              <button
                className="secondary"
                data-tv-default
                autoFocus
                onClick={() => setJamOpen(false)}
              >
                Back to arcade
              </button>
            </div>
            <div className="jam-scan">
              <div className="jam-qr">
                {jamQrTarget && jamQr?.url === jamQrTarget && (
                  <img
                    src={jamQr.image}
                    alt={jamUrl ? "QR code to join Spotify Jam" : "QR code to set up Spotify Jam on your phone"}
                    width={360}
                    height={360}
                  />
                )}
              </div>
              <div className="jam-approval">
                {jamUrl ? (
                  <>
                    <h3>Scan to join the queue</h3>
                    <p>Open the QR code with your phone camera, then add songs in Spotify.</p>
                    <button className="secondary" onClick={() => shareJam()}>
                      Remove invite and resume arcade music
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Send an invite from your phone</h3>
                    <p>Start a Jam in Spotify Premium and copy its share link. Scan this code and paste the link on your phone.</p>
                  </>
                )}
                {jamProposal && (
                  <>
                    <p>{state.players.find((player) => player.id === jamProposal.player)?.name ?? "A player"} sent a Jam invite.</p>
                    <div className="actions">
                      <button className="primary" onClick={() => shareJam(jamProposal.url)}>
                        Share invite with this room
                      </button>
                      <button className="subtle" onClick={() => setJamProposal(undefined)}>
                        Dismiss
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
      {endConfirm && (
        <div className="dialog-backdrop" onClick={() => setEndConfirm(false)}>
          <div
            className="panel wild-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="End game night"
            onClick={(e) => e.stopPropagation()}
          >
            <Crown color="#ffe17a" />
            <h2>End game night?</h2>
            <p>The podium uses the points from completed games.</p>
            <div className="actions">
              <button
                className="secondary"
                onClick={() => setEndConfirm(false)}
              >
                Keep playing
              </button>
              <button
                className="primary"
                onClick={() => {
                  setEndConfirm(false);
                  commit(podium(latest.current));
                }}
              >
                Crown winner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
