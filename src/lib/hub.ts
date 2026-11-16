import { registry, games } from "@/games/registry";
import {
  keyed,
  roll,
  shuffle,
  type GameChoice,
  type HubState,
  type HubView,
  type TeamId,
  type TeamRosters,
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
    teams: undefined,
    teamDraft: undefined,
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
    teams: undefined,
    teamDraft: undefined,
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

export function onTeamGameComplete(
  state: HubState,
  winner: TeamId | "draw",
  now: number,
): HubState {
  if (!state.teams) return voting(state, now);
  const points = { ...state.points };
  const wins = { ...state.wins };
  for (const team of ["signal", "cobalt"] as const) {
    for (const id of state.teams[team]) {
      points[id] = (points[id] ?? 0) + (winner === team ? 5 : 2);
      if (winner === team) wins[id] = (wins[id] ?? 0) + 1;
    }
  }
  return {
    ...voting(state, now),
    points,
    wins,
    gamesPlayed: state.gamesPlayed + 1,
    sound: { id: (state.sound?.id ?? 0) + 1, effect: "victory" },
  };
}

function startGame(
  state: HubState,
  choice: Exclude<GameChoice, "end">,
  ids: string[],
  now: number,
  teams?: TeamRosters,
): HubState {
  return {
    ...state,
    phase: "GAME",
    participants: ids,
    epoch: state.epoch + 1,
    deadline: 0,
    teamDraft: undefined,
    teams,
    game: {
      id: choice,
      data: registry[choice].create(
        { now, ids, online: ids, teams },
        state.spicy,
      ),
    },
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
  if (!registry[choice].team)
    return startGame(state, choice, shuffle(eligible), now);
  if (eligible.length < 4) return voting(state, now);
  return {
    ...state,
    phase: "TEAM_SPLIT",
    epoch: state.epoch + 1,
    deadline: now + 15000,
    game: undefined,
    teamDraft: { game: choice, eligible, picks: {} },
  };
}

export function chooseTeam(
  state: HubState,
  id: string,
  team: TeamId,
  now: number,
): HubState {
  const draft = state.teamDraft;
  if (
    state.phase !== "TEAM_SPLIT" ||
    now >= state.deadline ||
    !draft?.eligible.includes(id)
  )
    return state;
  const picks = draft.picks;
  const count = Object.values(picks).filter((pick) => pick === team).length;
  if (picks[id] === team || count >= Math.ceil(draft.eligible.length / 2))
    return state;
  return { ...state, teamDraft: { ...draft, picks: { ...picks, [id]: team } } };
}

export function finishTeamDraft(
  state: HubState,
  online: string[],
  now: number,
  auto = false,
): HubState {
  if (state.phase !== "TEAM_SPLIT" || !state.teamDraft) return state;
  const { eligible, picks, game } = state.teamDraft;
  const ids = shuffle(eligible.filter((id) => online.includes(id)));
  if (ids.length < 4) return voting(state, now);
  const teams: TeamRosters = { signal: [], cobalt: [] };
  const cap = Math.ceil(ids.length / 2);
  const unassigned: string[] = [];
  for (const id of ids) {
    const picked = auto ? undefined : picks[id];
    if (picked && teams[picked].length < cap) teams[picked].push(id);
    else unassigned.push(id);
  }
  for (const id of unassigned) {
    const team =
      teams.signal.length <= teams.cobalt.length ? "signal" : "cobalt";
    teams[team].push(id);
  }
  return startGame(state, game, ids, now, teams);
}

export function lockVote(
  state: HubState,
  ids: string[],
  now: number,
): HubState {
  const available = choices.filter(
    (id) => id === "end" || !registry[id].team || ids.length >= 4,
  );
  const counts = keyed(
    available,
    (choice) => ids.filter((id) => state.votes[id] === choice).length,
  );
  const top = Math.max(...Object.values(counts));
  if (!top && ids.length < 2) return voting(state, now);
  const tied = available.filter(
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
    teams,
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
