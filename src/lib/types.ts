export const COLORS = [
  ["Cherry", "#ff3667"],
  ["Tangerine", "#ff8835"],
  ["Lemon", "#ffe14b"],
  ["Lime", "#a6f858"],
  ["Mint", "#4df1b6"],
  ["Cyan", "#39d9f5"],
  ["Cobalt", "#5277ff"],
  ["Grape", "#9a58ff"],
  ["Bubblegum", "#f675d5"],
  ["Coral", "#ff796c"],
  ["Charcoal", "#647087"],
  ["Pearl", "#f3edff"],
] as const;

export type AvatarConfig = {
  shapeId: number;
  color: string;
  expressionId: number;
};
export type Player = {
  id: string;
  name: string;
  avatar: AvatarConfig;
  ready: boolean;
};
export type GameId =
  | "board-blitz"
  | "guess-sketch"
  | "crazy-cards"
  | "color-clash"
  | "bid-brush"
  | "quiplash-clash"
  | "fibbage-lies"
  | "split-the-room"
  | "tee-ko"
  | "fakin-it"
  | "trivia-dungeon"
  | "brainwaves"
  | "cipher-grid"
  | "signal-jam"
  | "defuse-panic";
export type GameChoice = GameId | "end";
export type Phase =
  | "LOBBY"
  | "VOTING"
  | "ROULETTE"
  | "TEAM_SPLIT"
  | "GAME"
  | "PODIUM"
  | "CREDITS";
export type TeamId = "signal" | "cobalt";
export type TeamRosters = Record<TeamId, string[]>;
export type TeamDraft = {
  game: GameId;
  eligible: string[];
  picks: Partial<Record<string, TeamId>>;
};
export type Session = { id: GameId; data: unknown };
export type HubView = {
  code: string;
  phase: Phase;
  epoch: number;
  deadline: number;
  sentAt?: number;
  spotifyJam?: string;
  players: Player[];
  online: string[];
  points: Record<string, number>;
  votes: Record<string, GameChoice>;
  roulette: GameChoice[];
  selected?: GameChoice;
  gamesPlayed: number;
  wins: Record<string, number>;
  game?: Session;
  teamDraft?: TeamDraft;
};
export type HubState = Omit<HubView, "online"> & {
  spicy: boolean;
  teams?: TeamRosters;
  participants: string[];
  creditsFrom?: "LOBBY" | "VOTING" | "PODIUM";
  creditsRemaining?: number;
  sound?: { id: number; effect: Effect };
};
export type Effect =
  | "join"
  | "tick"
  | "dice"
  | "coin"
  | "card"
  | "gavel"
  | "victory"
  | "boot"
  | "shutter";
export type Action = { type: string; value?: unknown };
export type Stroke = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
};
export const BRUSHES = [
  "#201b37",
  "#ef446e",
  "#fa902d",
  "#e6bb14",
  "#18ad83",
  "#3568ef",
] as const;

export function randomAvatar(): AvatarConfig {
  return {
    shapeId: roll(48) + 1,
    color: COLORS[roll(COLORS.length)][1],
    expressionId: roll(20) + 1,
  };
}

export function roll(max: number) {
  return Math.floor(Math.random() * max);
}

export function shuffle<T>(items: readonly T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = roll(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function keyed<T>(
  ids: readonly string[],
  create: (id: string) => T,
): Record<string, T> {
  return Object.fromEntries(ids.map((id) => [id, create(id)]));
}

export function cleanPlayer(value: unknown, id: string): Player | undefined {
  if (!value || typeof value !== "object") return;
  const p = value as Partial<Player>;
  if (typeof p.name !== "string" || !p.name.trim() || !p.avatar) return;
  const { shapeId, color, expressionId } = p.avatar;
  if (
    !Number.isInteger(shapeId) ||
    shapeId < 1 ||
    shapeId > 48 ||
    typeof color !== "string" ||
    !/^#[0-9a-f]{6}$/i.test(color) ||
    !Number.isInteger(expressionId) ||
    expressionId < 1 ||
    expressionId > 20
  )
    return;
  return {
    id,
    name: p.name.trim().slice(0, 18),
    avatar: { shapeId, color, expressionId },
    ready: p.ready === true,
  };
}

export function validStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== "object") return false;
  const { x1, y1, x2, y2, color, width } = value as Stroke;
  return (
    [x1, y1, x2, y2].every((n) => Number.isFinite(n) && n >= 0 && n <= 1) &&
    BRUSHES.some((brush) => brush === color) &&
    (width === 4 || width === 10)
  );
}

export function orderBy(ids: readonly string[], score: (id: string) => number) {
  return [...ids].sort((a, b) => score(b) - score(a));
}
