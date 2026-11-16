import type { ComponentType, CSSProperties } from "react";
import type {
  Action,
  Effect,
  GameId,
  HubView,
  Stroke,
  TeamId,
  TeamRosters,
} from "@/lib/types";

export type GameContext = {
  now: number;
  online: string[];
  ids: string[];
  teams?: TeamRosters;
};
export type GameResult<S> = {
  data: S;
  rankings?: string[];
  teamWinner?: TeamId | "draw";
  effect?: Effect;
  stroke?: Stroke[] | "clear";
};
export type ScreenProps<S> = {
  data: S;
  room: HubView;
  now: number;
  me: string;
  canvas?: { key: string; strokes: Stroke[] };
  send: (type: string, value?: unknown) => void;
};
export type PartyGamePlugin<S = unknown, V = S> = {
  id: GameId;
  title: string;
  team?: true;
  minPlayers?: 2 | 4;
  category: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  accent: string;
  create: (context: GameContext, spicy: boolean) => S;
  step: (
    data: S,
    context: GameContext,
    event?: Action & { player: string },
  ) => GameResult<S>;
  playerView: (data: S, id: string) => V;
  TV: ComponentType<ScreenProps<S>>;
  Phone: ComponentType<ScreenProps<V>>;
};

// The registry erases the state type at its boundary. Only a plugin's own engine can populate its state.
export function defineGame<S, V>(plugin: PartyGamePlugin<S, V>) {
  return plugin as unknown as PartyGamePlugin<unknown, unknown>;
}

export function gameColor(accent: string): CSSProperties {
  return { "--game-accent": accent } as CSSProperties;
}

export function secondsLeft(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function allOnlineActed(
  context: GameContext,
  acted: Record<string, unknown>,
) {
  const eligible = context.ids.filter((id) => context.online.includes(id));
  return (
    eligible.length > 0 && eligible.every((id) => Object.hasOwn(acted, id))
  );
}
