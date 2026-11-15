import { Clock3, Coins } from "@/components/ArcadeIcons";
import type { HubView, Player } from "@/lib/types";
import JellyAvatar, { type Reaction } from "./JellyAvatar";
import { secondsLeft } from "@/games/types";

export function findPlayer(room: HubView, id: string) {
  return room.players.find((p) => p.id === id);
}
export function nameOf(room: HubView, id: string) {
  return findPlayer(room, id)?.name ?? "Player";
}

export function PlayerBadge({
  player,
  size = 44,
  detail,
  reaction,
  dim = false,
}: {
  player?: Player;
  size?: number;
  detail?: React.ReactNode;
  reaction?: Reaction;
  dim?: boolean;
}) {
  if (!player) return null;
  return (
    <div className="player-badge" data-dim={dim}>
      <JellyAvatar {...player.avatar} size={size} reaction={reaction} />
      <div>
        <strong>{player.name}</strong>
        {detail !== undefined && <small>{detail}</small>}
      </div>
    </div>
  );
}

export function Timer({
  deadline,
  now,
  duration,
}: {
  deadline: number;
  now: number;
  duration?: number;
}) {
  const seconds = secondsLeft(deadline, now);
  return (
    <div className="timer" data-urgent={seconds <= 10}>
      <span>
        <Clock3 size={17} />{" "}
        <b>{`0${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</b>
      </span>
      {duration && (
        <div className="timer-track">
          <i
            style={{ width: `${Math.min(100, (100 * seconds) / duration)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function CoinCount({ coins }: { coins: number }) {
  return (
    <span className="coin-count">
      <Coins size={16} /> {coins}
    </span>
  );
}

export const dollars = (amount: number) => "$" + amount.toLocaleString("en-US");
