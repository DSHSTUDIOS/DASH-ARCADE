import { Layers3 } from "@/components/ArcadeIcons";
import { nameOf, Timer, PlayerBadge, findPlayer } from "@/components/GameUI";
import { defineGame, type ScreenProps } from "../types";
import type { TeamId } from "@/lib/types";
import { teamNames, teamResultLabel, teamRosters } from "../team/shared";
import { advanceDuel, canPlayDuel, duelPlayer, type DuelTurn } from "./duel";

const cols = 7;
const rows = 6;
type Cell = TeamId | null;
type State = DuelTurn & {
  board: Cell[];
  last?: number;
  line: number[];
  winner?: TeamId | "draw";
};

export function fourInLine(board: Cell[], last: number) {
  const owner = board[last];
  if (!owner) return [];
  const x = last % cols,
    y = Math.floor(last / cols);
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]) {
    const line = [last];
    for (const direction of [-1, 1])
      for (let n = 1; n < 4; n++) {
        const col = x + dx * n * direction,
          row = y + dy * n * direction,
          p = row * cols + col;
        if (
          col < 0 ||
          col >= cols ||
          row < 0 ||
          row >= rows ||
          board[p] !== owner
        )
          break;
        line.push(p);
      }
    if (line.length >= 4) return line;
  }
  return [];
}
function lowest(board: Cell[], col: number) {
  for (let row = rows - 1; row >= 0; row--)
    if (board[row * cols + col] === null) return row * cols + col;
  return -1;
}
function Board({ data }: { data: State }) {
  return (
    <div className="drop-board" aria-label="Drop Zone board">
      {data.board.map((cell, i) => (
        <span
          key={i}
          className="drop-cell"
          data-team={cell ?? undefined}
          data-last={data.last === i}
          data-line={data.line.includes(i)}
          aria-label={`Row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}: ${cell ? teamNames[cell] : "empty"}`}
        />
      ))}
    </div>
  );
}
function TV({ data, room, now }: ScreenProps<State>) {
  const player = findPlayer(room, duelPlayer(data));
  return (
    <section className="team-surface classic-surface classic-duel">
      <div className="classic-caption">
        <div>
          <h2>
            {data.winner
              ? teamResultLabel(data.winner)
              : `${teamNames[data.turn]} to drop`}
          </h2>
          <p>Line up four in any direction.</p>
        </div>
        {!data.winner && (
          <>
            <PlayerBadge player={player} size={40} />
            <Timer now={now} deadline={data.deadline} />
          </>
        )}
      </div>
      <Board data={data} />
    </section>
  );
}
function Phone({ data, room, me, now, send }: ScreenProps<State>) {
  const canDrop = !data.winner && canPlayDuel(data, me);
  return (
    <div className="team-stack">
      <div className="classic-caption">
        <strong>
          {data.winner
            ? teamResultLabel(data.winner)
            : canDrop
              ? "Pick a column"
              : `${nameOf(room, duelPlayer(data))} is choosing`}
        </strong>
        {!data.winner && <Timer now={now} deadline={data.deadline} />}
      </div>
      <Board data={data} />
      {canDrop && (
        <div className="drop-controls">
          {Array.from({ length: cols }, (_, col) => (
            <button
              type="button"
              className="secondary"
              key={col}
              aria-label={`Drop in column ${col + 1}`}
              disabled={lowest(data.board, col) < 0}
              onClick={() => send("drop", col)}
            >
              {col + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export default defineGame<State, State>({
  id: "drop-zone",
  title: "Drop Zone",
  team: true,
  minPlayers: 2,
  category: "FOUR-IN-A-ROW",
  description: "Drop into columns. Get four in a row before the other side.",
  icon: Layers3,
  accent: "#ef805a",
  create(context) {
    return {
      teams: teamRosters(context, 1),
      turn: "signal",
      attempts: { signal: 0, cobalt: 0 },
      passed: 0,
      deadline: context.now + 25000,
      board: Array<Cell>(cols * rows).fill(null),
      line: [],
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
            ? { ...data, winner: "draw", deadline: now + 4000 }
            : advanceDuel(data, now, true),
      };
    if (
      event?.type !== "drop" ||
      !canPlayDuel(data, event.player) ||
      typeof event.value !== "number" ||
      !Number.isInteger(event.value) ||
      event.value < 0 ||
      event.value >= cols
    )
      return { data };
    const last = lowest(data.board, event.value);
    if (last < 0) return { data };
    const board = [...data.board];
    board[last] = data.turn;
    const line = fourInLine(board, last);
    const winner = line.length
      ? data.turn
      : board.every(Boolean)
        ? "draw"
        : undefined;
    const next = { ...data, board, last, line };
    return winner
      ? { data: { ...next, winner, deadline: now + 4500 }, effect: "victory" }
      : { data: advanceDuel(next, now), effect: "card" };
  },
  playerView: (data) => data,
  TV,
  Phone,
});
