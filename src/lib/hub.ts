import { registry, games } from "@/games/registry";
import {
  keyed,
  roll,
  shuffle,
  type GameChoice,
  type HubState,
  type HubView,
} from "./types";

export const ROOM_CAP = 12;
export const VOTE_TIME = 60000;
export const choices: GameChoice[] = [...games.map((game) => game.id), "end"];
export const roomKey = (code: string) => `party_hub_${code}`;

export function emptyRoom(code: string): HubState {
  return {
    code,
    phase: "LOBBY",
    epoch: 0,
    deadline: 0,
    players: [],
    points: {},
    votes: {},
    roulette: [],
    gamesPlayed: 0,
    wins: {},
    spicy: false,
    participants: [],
  };
}

export function roomCode() {
  return Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + roll(26)),
  ).join("");
}

export function voting(state: HubState, now: number): HubState {
  return {
    ...state,
    phase: "VOTING",
    epoch: state.epoch + 1,
    deadline: now + VOTE_TIME,
    votes: {},
    selected: undefined,
    roulette: [],
    game: undefined,
    participants: [],
  };
}

export function podium(state: HubState): HubState {
  return {
    ...state,
    phase: "PODIUM",
    epoch: state.epoch + 1,
    deadline: 0,
    game: undefined,
    participants: [],
    sound: { id: (state.sound?.id ?? 0) + 1, effect: "victory" },
  };
}

export function onGameComplete(
  state: HubState,
  rankings: string[],
  now: number,
) {
  const ordered = [...new Set([...rankings, ...state.participants])].filter(
    (id) => state.participants.includes(id),
  );
  const leader = ordered[0];
  const points = { ...state.points };
  ordered.forEach((id, index) => {
    points[id] = (points[id] ?? 0) + ([5, 3, 2][index] ?? 1);
  });
  return {
    ...voting(state, now),
    points,
    gamesPlayed: state.gamesPlayed + 1,
    wins: leader
      ? { ...state.wins, [leader]: (state.wins[leader] ?? 0) + 1 }
      : state.wins,
    sound: { id: (state.sound?.id ?? 0) + 1, effect: "victory" as const },
  };
}

export function launch(
  state: HubState,
  choice: GameChoice,
  eligible: string[],
  now: number,
): HubState {
  if (choice === "end") return podium(state);
  if (eligible.length < 2) return voting(state, now);
  const game = registry[choice];
  const ids = shuffle(eligible);
  return {
    ...state,
    phase: "GAME",
    participants: ids,
    epoch: state.epoch + 1,
    deadline: 0,
    game: {
      id: choice,
      data: game.create({ now, ids, online: ids }, state.spicy),
    },
  };
}

export function lockVote(
  state: HubState,
  ids: string[],
  now: number,
): HubState {
  const counts = keyed(
    choices,
    (choice) => ids.filter((id) => state.votes[id] === choice).length,
  );
  const top = Math.max(...Object.values(counts));
  if (!top && ids.length < 2) return voting(state, now);
  const tied = choices.filter(
    (choice) => counts[choice] === top && (top || choice !== "end"),
  );
  const selected = tied[roll(tied.length)];
  if (tied.length === 1) return launch(state, selected, ids, now);
  return {
    ...state,
    phase: "ROULETTE",
    epoch: state.epoch + 1,
    roulette: tied,
    selected,
    deadline: now + 2850,
  };
}

export function openCredits(state: HubState, now: number): HubState {
  if (
    state.phase !== "LOBBY" &&
    state.phase !== "VOTING" &&
    state.phase !== "PODIUM"
  )
    return state;
  return {
    ...state,
    phase: "CREDITS",
    epoch: state.epoch + 1,
    creditsFrom: state.phase,
    creditsRemaining: Math.max(0, state.deadline - now),
  };
}

export function closeCredits(state: HubState, now: number): HubState {
  if (state.phase !== "CREDITS") return state;
  return {
    ...state,
    phase: state.creditsFrom ?? "LOBBY",
    epoch: state.epoch + 1,
    deadline:
      state.creditsFrom === "VOTING"
        ? now + (state.creditsRemaining ?? VOTE_TIME)
        : 0,
    creditsFrom: undefined,
    creditsRemaining: undefined,
  };
}

export function toView(
  state: HubState,
  online: string[],
  forPlayer?: string,
): HubView {
  const {
    participants,
    sound,
    spicy,
    game,
    creditsFrom,
    creditsRemaining,
    ...view
  } = state;
  const visibleGame =
    game && (forPlayer === undefined || participants.includes(forPlayer))
      ? {
          id: game.id,
          data:
            forPlayer === undefined
              ? game.data
              : registry[game.id].playerView(game.data, forPlayer),
        }
      : undefined;
  return {
    ...view,
    online,
    game: visibleGame,
    selected: state.phase === "ROULETTE" ? undefined : state.selected,
  };
}

export function openRoom(): { state: HubState; id: string } {
  const current = new URL(window.location.href);
  const incoming = current.searchParams.get("room")?.toUpperCase();
  let code = incoming && /^[A-Z]{4}$/.test(incoming) ? incoming : roomCode();
  if (!incoming) while (localStorage.getItem(roomKey(code))) code = roomCode();
  const key = roomKey(code);
  const id = localStorage.getItem(key + "_host") || crypto.randomUUID();
  localStorage.setItem(key + "_host", id);
  current.searchParams.set("room", code);
  window.history.replaceState(null, "", current);
  try {
    const saved = JSON.parse(
      localStorage.getItem(key) ?? "null",
    ) as HubState | null;
    if (saved?.code === code) return { state: saved, id };
  } catch {
    /* A malformed save can be replaced with a fresh lobby. */
  }
  return { state: emptyRoom(code), id };
}
