"use client";

import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Sparkles,
  Trophy,
} from "@/components/ArcadeIcons";
import Link from "next/link";
import JellyAvatar from "./JellyAvatar";
import { findPlayer, PlayerBadge } from "./GameUI";
import { games, registry } from "@/games/registry";
import { gameColor } from "@/games/types";
import { orderBy, type GameChoice, type HubView } from "@/lib/types";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className="brand"
      aria-label="Dash Arcade home"
      data-light={light}
    >
      <span className="brand-icon">
        <img src="/icons/arcade-logo.svg" width={33} height={33} alt="" />
      </span>
      <span>
        DASH<span className="brand-accent">ARCADE</span>
        <small>TV PARTY HUB</small>
      </span>
    </Link>
  );
}

export function Signature() {
  return <span className="signature">MADE BY PRATIK DASH</span>;
}

export function ModuleLabel({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="eyebrow module-label">
      {icon}
      {children}
    </span>
  );
}

const endCard = {
  title: "End Game Night & Crown Winner",
  category: "GRAND FINALE",
  description: "Crown the winner and reveal tonight’s podium.",
  icon: Crown,
  accent: "#ffe17a",
};
export const gameInfo = (id: GameChoice) =>
  id === "end" ? endCard : registry[id];

export function GameCard({
  choice,
  room,
  selected,
  onVote,
  highlighted,
}: {
  choice: GameChoice;
  room?: HubView;
  selected?: boolean;
  highlighted?: boolean;
  onVote?: () => void;
}) {
  const { title, category, description, icon: Icon, accent } = gameInfo(choice);
  const content = (
    <>
      <div className="game-card-icon">
        <Icon size={25} strokeWidth={2} />
      </div>
      <div className="game-card-copy">
        <span>{category}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {room && (
        <div className="voter-badges">
          {Object.entries(room.votes)
            .filter(([id, vote]) => vote === choice && room.online.includes(id))
            .map(([id]) => {
              const player = findPlayer(room, id);
              return (
                player && (
                  <span key={id} title={player.name} className="vote-avatar">
                    <JellyAvatar
                      {...player.avatar}
                      size={40}
                      reaction="happy"
                    />
                  </span>
                )
              );
            })}
        </div>
      )}
      {onVote && <ArrowRight className="choice-arrow" size={18} />}
    </>
  );
  const style = gameColor(accent);
  return onVote ? (
    <button
      type="button"
      className="game-card vote-choice"
      style={style}
      aria-pressed={selected}
      onClick={onVote}
    >
      {content}
    </button>
  ) : (
    <article className="game-card" style={style} data-highlighted={highlighted}>
      {content}
    </article>
  );
}

export function VotingCards({
  room,
  active,
  me,
  onVote,
}: {
  room: HubView;
  active?: GameChoice;
  me?: string;
  onVote?: (choice: GameChoice) => void;
}) {
  return (
    <div className="vote-grid">
      {[...games.map((game) => game.id), "end" as const].map((choice) => (
        <GameCard
          key={choice}
          choice={choice}
          room={onVote ? undefined : room}
          highlighted={active === choice}
          selected={me ? room.votes[me] === choice : false}
          onVote={onVote ? () => onVote(choice) : undefined}
        />
      ))}
    </div>
  );
}

export function ranked(room: HubView) {
  return orderBy(
    room.players
      .filter((p) => p.ready || (room.points[p.id] ?? 0) > 0)
      .map((p) => p.id),
    (id) => room.points[id] ?? 0,
  ).sort(
    (a, b) =>
      (room.points[b] ?? 0) - (room.points[a] ?? 0) ||
      (room.wins[b] ?? 0) - (room.wins[a] ?? 0),
  );
}

export function Leaderboard({ room }: { room: HubView }) {
  const ids = ranked(room);
  return (
    <aside className="panel leaderboard">
      <ModuleLabel icon={<Trophy size={15} />}>GLOBAL LEADERBOARD</ModuleLabel>
      <h2>Top players</h2>
      <p>
        {room.gamesPlayed} {room.gamesPlayed === 1 ? "game" : "games"} played
        tonight
      </p>
      <div className="leaderboard-list">
        {ids.map((id, i) => (
          <div className="leaderboard-row" key={id}>
            <span className="place">{i + 1}</span>
            <PlayerBadge
              player={findPlayer(room, id)}
              size={36}
              dim={!room.online.includes(id)}
            />
            <b>
              {room.points[id] ?? 0}
              <small> PT</small>
            </b>
          </div>
        ))}
      </div>
      <div className="leaderboard-footer">
        <Sparkles size={15} /> 1st +5 · 2nd +3 · 3rd +2 · Play +1
      </div>
    </aside>
  );
}

export function Podium({ room, onNew }: { room: HubView; onNew: () => void }) {
  const ids = ranked(room);
  const winner = findPlayer(room, ids[0]);
  const mostWins = orderBy(ids, (id) => room.wins[id] ?? 0)[0];
  const mvp = findPlayer(room, mostWins);
  const confettiColors = [
    "#B3F675",
    "#F76DBF",
    "#B59AFF",
    "#FFD674",
    "#63E3D0",
  ];
  return (
    <section className="podium-scene">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 58 }, (_, i) => (
          <i
            key={i}
            style={
              {
                "--x": ((i * 47) % 100) + "%",
                "--drift": ((i * 19) % 240) - 120 + "px",
                "--spin": ((i * 71) % 420) + "deg",
                "--duration": `${3 + (i % 7) / 2}s`,
                "--delay": `${(i % 15) / 6}s`,
                background: confettiColors[i % confettiColors.length],
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <ModuleLabel icon={<Crown size={16} />}>GRAND FINALE</ModuleLabel>
      <h1>
        {winner ? `${winner.name} takes the crown!` : "That’s game night!"}
      </h1>
      <p>
        {room.gamesPlayed} {room.gamesPlayed === 1 ? "game" : "games"} played
      </p>
      <div className="podium-blocks">
        {[1, 0, 2].map((i) => {
          const player = findPlayer(room, ids[i]);
          if (!player) return null;
          return (
            <div key={player.id} className="podium-place" data-place={i + 1}>
              {i === 0 && (
                <Crown className="podium-crown" size={37} fill="currentColor" />
              )}
              <JellyAvatar
                {...player.avatar}
                size={i === 0 ? 215 : 150}
                reaction={i === 0 ? "winner" : "happy"}
              />
              <h3>{player.name}</h3>
              <span>{room.points[player.id] ?? 0} hub points</span>
              <div className="pedestal">{i + 1}</div>
            </div>
          );
        })}
      </div>
      <div className="mvp-awards">
        {winner && (
          <span className="pill">
            <Trophy size={16} /> Night champion · {winner.name}
          </span>
        )}
        {mvp && room.wins[mvp.id] > 0 && (
          <span className="pill">
            <Sparkles size={16} /> Most wins · {mvp.name} ({room.wins[mvp.id]})
          </span>
        )}
      </div>
      <button className="secondary" onClick={onNew}>
        <ArrowLeft size={16} /> Host a new room
      </button>
    </section>
  );
}
