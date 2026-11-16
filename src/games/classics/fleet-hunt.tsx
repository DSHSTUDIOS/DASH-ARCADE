import { Radio } from "@/components/ArcadeIcons";
import { nameOf, Timer, PlayerBadge, findPlayer } from "@/components/GameUI";
import { defineGame, type ScreenProps } from "../types";
import { roll, type TeamId } from "@/lib/types";
import {
  otherTeam,
  TEAM_IDS,
  teamNames,
  teamOf,
  teamResult,
  teamResultLabel,
  teamRosters,
} from "../team/shared";
import { advanceDuel, canPlayDuel, duelPlayer, type DuelTurn } from "./duel";

const size = 6;
const total = 7;
type Mark = "hit" | "miss";
type ShotMap = Partial<Record<number, Mark>>;
type State = DuelTurn & {
  fleets: Record<TeamId, number[]>;
  shots: Record<TeamId, ShotMap>;
  latest?: { team: TeamId; square: number };
  winner?: TeamId | "draw";
};
type View = Omit<State, "fleets"> & { ownFleet?: number[]; team?: TeamId };
function fleet() {
  const cells = new Set<number>();
  for (const length of [3, 2, 2]) {
    const positions: number[][] = [];
    for (let row = 0; row < size; row++)
      for (let col = 0; col < size; col++) {
        for (const horizontal of [true, false]) {
          if ((horizontal ? col : row) + length > size) continue;
          const picks = Array.from(
            { length },
            (_, offset) => row * size + col + offset * (horizontal ? 1 : size),
          );
          if (picks.every((p) => !cells.has(p))) positions.push(picks);
        }
      }
    positions[roll(positions.length)].forEach((p) => cells.add(p));
  }
  return [...cells];
}
const hits = (shots: ShotMap) =>
  Object.values(shots).filter((mark) => mark === "hit").length;
const coord = (i: number) =>
  `${String.fromCharCode(65 + Math.floor(i / size))}${(i % size) + 1}`;

function Chart({
  shots,
  ships,
  last,
  onFire,
}: {
  shots: ShotMap;
  ships?: number[];
  last?: number;
  onFire?: (p: number) => void;
}) {
  return (
    <div className="fleet-chart">
      {Array.from({ length: size * size }, (_, i) => {
        const mark = shots[i] ?? (ships?.includes(i) ? "ship" : undefined);
        const label = coord(i) + (mark ? ` ${mark}` : "");
        return onFire ? (
          <button
            type="button"
            className="fleet-cell"
            key={i}
            data-mark={mark}
            aria-label={label}
            disabled={!!shots[i]}
            onClick={() => onFire(i)}
          >
            {coord(i)}
          </button>
        ) : (
          <span
            key={i}
            className="fleet-cell"
            data-mark={mark}
            data-last={last === i}
            aria-label={label}
          >
            {coord(i)}
          </span>
        );
      })}
    </div>
  );
}
function TV({ data, room, now }: ScreenProps<State>) {
  return (
    <section className="team-surface classic-surface">
      <div className="classic-caption">
        <h2>
          {data.winner
            ? teamResultLabel(data.winner)
            : `${teamNames[data.turn]} to fire`}
        </h2>
        {!data.winner && (
          <>
            <PlayerBadge
              player={findPlayer(room, duelPlayer(data))}
              size={36}
            />
            <Timer now={now} deadline={data.deadline} />
          </>
        )}
      </div>
      <div className="team-pair fleet-duel">
        {TEAM_IDS.map((team) => (
          <article className="team-box" data-team={team} key={team}>
            <header>
              <h3>{teamNames[team]} waters</h3>
              <b>
                {hits(data.shots[otherTeam(team)])} / {total} hit
              </b>
            </header>
            <Chart
              shots={data.shots[otherTeam(team)]}
              ships={data.winner ? data.fleets[team] : undefined}
              last={data.latest?.team === team ? data.latest.square : undefined}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
function Phone({ data, room, me, now, send }: ScreenProps<View>) {
  if (!data.team) return null;
  const ours = data.team,
    rival = otherTeam(ours);
  return (
    <div className="team-stack">
      <div className="classic-caption">
        <strong>
          {data.winner
            ? teamResultLabel(data.winner)
            : canPlayDuel(data, me)
              ? "Pick a target"
              : `${nameOf(room, duelPlayer(data))} is aiming`}
        </strong>
        {!data.winner && <Timer now={now} deadline={data.deadline} />}
      </div>
      <h2>Target chart</h2>
      <Chart
        shots={data.shots[ours]}
        last={data.latest?.team === rival ? data.latest.square : undefined}
        onFire={
          !data.winner && canPlayDuel(data, me)
            ? (i) => send("fire", i)
            : undefined
        }
      />
      <details>
        <summary>Your hidden fleet</summary>
        <Chart shots={data.shots[rival]} ships={data.ownFleet} />
      </details>
    </div>
  );
}
export default defineGame<State, View>({
  id: "fleet-hunt",
  title: "Fleet Hunt",
  team: true,
  minPlayers: 2,
  category: "HIDDEN FLEETS",
  description: "Trade shots on a six-by-six sea. Your fleet stays private.",
  icon: Radio,
  accent: "#83c5e6",
  create(context) {
    return {
      teams: teamRosters(context, 1),
      turn: "signal",
      attempts: { signal: 0, cobalt: 0 },
      passed: 0,
      deadline: context.now + 25000,
      fleets: { signal: fleet(), cobalt: fleet() },
      shots: { signal: {}, cobalt: {} },
    };
  },
  step(data, { now }, event) {
    if (data.winner)
      return now >= data.deadline
        ? { data, teamWinner: data.winner }
        : { data };
    if (now >= data.deadline)
      return {
        data:
          data.passed >= 3
            ? {
                ...data,
                winner: teamResult({
                  signal: hits(data.shots.signal),
                  cobalt: hits(data.shots.cobalt),
                }),
                deadline: now + 4500,
              }
            : advanceDuel(data, now, true),
      };
    if (
      event?.type !== "fire" ||
      !canPlayDuel(data, event.player) ||
      typeof event.value !== "number" ||
      !Number.isInteger(event.value) ||
      event.value < 0 ||
      event.value >= size * size ||
      data.shots[data.turn][event.value]
    )
      return { data };
    const square = event.value,
      rival = otherTeam(data.turn),
      mark: Mark = data.fleets[rival].includes(square) ? "hit" : "miss";
    const shots = {
      ...data.shots,
      [data.turn]: { ...data.shots[data.turn], [square]: mark },
    };
    const next = { ...data, shots, latest: { team: rival, square } };
    return hits(shots[data.turn]) === total
      ? {
          data: { ...next, winner: data.turn, deadline: now + 5000 },
          effect: "victory",
        }
      : {
          data: advanceDuel(next, now),
          effect: mark === "hit" ? "gavel" : "card",
        };
  },
  playerView({ fleets, ...data }, id) {
    const team = teamOf(data.teams, id);
    return { ...data, team, ownFleet: team ? fleets[team] : undefined };
  },
  TV,
  Phone,
});
