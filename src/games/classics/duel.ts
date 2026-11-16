import { teamOf, otherTeam } from "@/games/team/shared";
import type { TeamId, TeamRosters } from "@/lib/types";

export type DuelTurn = {
  teams: TeamRosters;
  turn: TeamId;
  attempts: Record<TeamId, number>;
  deadline: number;
  passed: number;
};

export function duelPlayer(data: DuelTurn) {
  const seats = data.teams[data.turn];
  return seats[data.attempts[data.turn] % seats.length];
}

export function advanceDuel<T extends DuelTurn>(
  data: T,
  now: number,
  missed = false,
): T {
  return {
    ...data,
    turn: otherTeam(data.turn),
    attempts: { ...data.attempts, [data.turn]: data.attempts[data.turn] + 1 },
    deadline: now + 25000,
    passed: missed ? data.passed + 1 : 0,
  };
}

export function canPlayDuel(data: DuelTurn, id: string) {
  return teamOf(data.teams, id) === data.turn && duelPlayer(data) === id;
}
