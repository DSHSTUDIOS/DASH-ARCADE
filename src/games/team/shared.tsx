import type { ReactNode } from "react";
import type { GameContext } from "@/games/types";
import { Timer } from "@/components/GameUI";
import type { TeamId, TeamRosters } from "@/lib/types";

export const TEAM_IDS = ["signal", "cobalt"] as const;
export const teamNames = { signal: "Team Signal", cobalt: "Team Cobalt" };
export const otherTeam = (team: TeamId): TeamId =>
  team === "signal" ? "cobalt" : "signal";
export const teamOf = (teams: TeamRosters, id: string) =>
  TEAM_IDS.find((team) => teams[team].includes(id));

export function teamRosters(context: GameContext): TeamRosters {
  if (
    !context.teams ||
    TEAM_IDS.some((team) => context.teams![team].length < 2)
  )
    throw new Error("Team games require at least two players on each team.");
  return context.teams;
}

export function teamResult(
  scores: Record<TeamId, number>,
  tiebreak?: Record<TeamId, number>,
): TeamId | "draw" {
  const margin =
    scores.signal - scores.cobalt ||
    (tiebreak ? tiebreak.signal - tiebreak.cobalt : 0);
  return margin > 0 ? "signal" : margin < 0 ? "cobalt" : "draw";
}

export function teamResultLabel(team: TeamId | "draw") {
  return team === "draw" ? "It’s a draw" : `${teamNames[team]} wins`;
}

export function TeamScoreboard({
  scores,
  deadline,
  now,
  children,
}: {
  scores: Record<TeamId, number>;
  deadline: number;
  now: number;
  children?: ReactNode;
}) {
  return (
    <header className="team-scoreboard">
      <span className="team-score" data-team="signal">
        <span>Signal</span>
        <b>{scores.signal}</b>
      </span>
      <div className="team-score-center">
        {children}
        <Timer deadline={deadline} now={now} />
      </div>
      <span className="team-score" data-team="cobalt">
        <span>Cobalt</span>
        <b>{scores.cobalt}</b>
      </span>
    </header>
  );
}

export function oneWord(value: unknown): string {
  return typeof value === "string" && /^[\p{L}]{1,28}$/u.test(value.trim())
    ? value.trim()
    : "";
}

export function wordsIn(value: string) {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}
