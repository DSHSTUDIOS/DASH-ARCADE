import { useState } from "react";
import { defineGame, type ScreenProps } from "../types";
import { shuffle, type TeamId, type TeamRosters } from "@/lib/types";
import { CipherIcon } from "./icons";
import { spyWords } from "./word-bank";
import {
  oneWord,
  otherTeam,
  teamNames,
  teamOf,
  teamResultLabel,
  teamRosters,
  TeamScoreboard,
} from "./shared";

type Color = TeamId | "neutral" | "blackout";
type Keycard = { word: string; color: Color; flipped: boolean };
type State = {
  teams: TeamRosters;
  handlers: Record<TeamId, string>;
  cards: Keycard[];
  active: TeamId;
  stage: "CLUE" | "GUESS" | "RESULT";
  clue?: { word: string; count: number };
  guesses: number;
  deadline: number;
  winner?: TeamId;
  note: string;
};
type View = Omit<State, "cards"> & {
  cards: (Omit<Keycard, "color"> & { color?: Color })[];
};
const colorNames: Record<Color, string> = {
  signal: "Signal",
  cobalt: "Cobalt",
  neutral: "Neutral",
  blackout: "Blackout",
};
function remaining(cards: View["cards"]) {
  return {
    signal: 9 - cards.filter((c) => c.flipped && c.color === "signal").length,
    cobalt: 8 - cards.filter((c) => c.flipped && c.color === "cobalt").length,
  };
}
function validClue(value: unknown, cards: View["cards"]) {
  if (!value || typeof value !== "object") return;
  const { word, count } = value as { word?: unknown; count?: unknown };
  const text = oneWord(word);
  if (
    !text ||
    !Number.isInteger(count) ||
    Number(count) < 1 ||
    Number(count) > 9 ||
    cards.some((c) => c.word.toLowerCase() === text.toLowerCase())
  )
    return;
  return { word: text.toUpperCase(), count: Number(count) };
}
function nextTurn(s: State, now: number, note: string): State {
  return {
    ...s,
    active: otherTeam(s.active),
    stage: "CLUE",
    deadline: now + 40000,
    clue: undefined,
    guesses: 0,
    note,
  };
}

function Grid({
  cards,
  secret,
  onFlip,
}: {
  cards: View["cards"];
  secret?: boolean;
  onFlip?: (i: number) => void;
}) {
  return (
    <div
      className="cipher-grid"
      aria-label={secret ? "Secret handler key" : "Codename grid"}
    >
      {cards.map((c, i) => {
        const label = c.color ? `${c.word}, ${colorNames[c.color]}` : c.word;
        return onFlip ? (
          <button
            key={c.word}
            className="cipher-card"
            type="button"
            data-color={c.color}
            data-flipped={c.flipped}
            aria-label={label}
            disabled={c.flipped}
            onClick={() => onFlip(i)}
          >
            {c.word}
          </button>
        ) : (
          <span
            key={c.word}
            className="cipher-card"
            data-color={c.color}
            data-flipped={c.flipped}
            aria-label={label}
          >
            {c.word}
          </span>
        );
      })}
    </div>
  );
}

function ClueBanner({ data }: { data: View }) {
  return (
    <div className="team-callout">
      <strong>
        {data.winner
          ? teamResultLabel(data.winner)
          : data.clue
            ? `CLUE: ${data.clue.word} // ${data.clue.count}`
            : `${teamNames[data.active]} · Waiting for the Handler`}
      </strong>
      {data.note && <span>{data.note}</span>}
    </div>
  );
}
function TV({ data, now }: ScreenProps<State>) {
  return (
    <section className="team-game team-surface">
      <TeamScoreboard
        scores={remaining(data.cards)}
        deadline={data.deadline}
        now={now}
      >
        Cards remaining
      </TeamScoreboard>
      <ClueBanner data={data} />
      <Grid
        cards={data.cards.map((c) => ({
          ...c,
          color: c.flipped ? c.color : undefined,
        }))}
      />
    </section>
  );
}
function Phone({ data, me, now, send }: ScreenProps<View>) {
  const [word, setWord] = useState("");
  const [count, setCount] = useState(1);
  const team = teamOf(data.teams, me);
  const handler = team !== undefined && data.handlers[team] === me;
  const yourTurn = team === data.active && data.stage !== "RESULT";
  const canFlip = yourTurn && !handler && data.stage === "GUESS";
  return (
    <div className="team-stack">
      <TeamScoreboard
        scores={remaining(data.cards)}
        deadline={data.deadline}
        now={now}
      >
        {handler ? "Handler" : "Field Operative"}
      </TeamScoreboard>
      <ClueBanner data={data} />
      <Grid
        cards={data.cards}
        secret={handler}
        onFlip={canFlip ? (i) => send("flip", i) : undefined}
      />
      {handler && (
        <p className="cipher-legend">
          <span data-color="signal">Signal</span>
          <span data-color="cobalt">Cobalt</span>
          <span data-color="neutral">Neutral</span>
          <span data-color="blackout">Blackout</span>
        </p>
      )}
      {yourTurn && handler && data.stage === "CLUE" && (
        <form
          className="team-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const clue = validClue({ word, count }, data.cards);
            if (clue) {
              send("clue", clue);
              setWord("");
            }
          }}
        >
          <label>
            One-word clue
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              maxLength={28}
            />
          </label>
          <label>
            Number of cards
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {Array.from({ length: 9 }, (_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            disabled={!validClue({ word, count }, data.cards)}
          >
            Transmit clue
          </button>
        </form>
      )}
      {canFlip && (
        <button className="secondary" onClick={() => send("end-turn")}>
          End Turn · {data.guesses} guesses left
        </button>
      )}
    </div>
  );
}
export default defineGame<State, View>({
  id: "cipher-grid",
  team: true,
  title: "Cipher Grid",
  category: "TEAM SPY GRID",
  description:
    "Handlers clue their operatives through a secret grid. Avoid the Blackout Trap.",
  icon: CipherIcon,
  accent: "#0047ff",
  create(context) {
    const teams = teamRosters(context);
    const key = shuffle<Color>([
      ...Array<Color>(9).fill("signal"),
      ...Array<Color>(8).fill("cobalt"),
      ...Array<Color>(7).fill("neutral"),
      "blackout",
    ]);
    return {
      teams,
      handlers: { signal: teams.signal[0], cobalt: teams.cobalt[0] },
      cards: shuffle(spyWords)
        .slice(0, 25)
        .map((word, i) => ({
          word: word.toUpperCase(),
          color: key[i],
          flipped: false,
        })),
      active: "signal",
      stage: "CLUE",
      guesses: 0,
      deadline: context.now + 40000,
      note: "",
    };
  },
  step(s, { now }, event) {
    if (s.stage === "RESULT")
      return now >= s.deadline
        ? { data: s, teamWinner: s.winner }
        : { data: s };
    if (now >= s.deadline) return { data: nextTurn(s, now, "Time ran out.") };
    if (!event || !s.teams[s.active].includes(event.player)) return { data: s };
    const handler = s.handlers[s.active] === event.player;
    if (s.stage === "CLUE" && handler && event.type === "clue") {
      const clue = validClue(event.value, s.cards);
      if (clue)
        return {
          data: {
            ...s,
            stage: "GUESS",
            clue,
            guesses: clue.count + 1,
            deadline: now + 45000,
            note: "",
          },
          effect: "card",
        };
    }
    if (s.stage === "GUESS" && !handler) {
      if (event.type === "end-turn")
        return { data: nextTurn(s, now, "Operatives ended their turn.") };
      if (
        event.type === "flip" &&
        typeof event.value === "number" &&
        Number.isInteger(event.value)
      ) {
        const card = s.cards[event.value];
        if (!card || card.flipped) return { data: s };
        const cards = s.cards.map((c, i) =>
          i === event.value ? { ...c, flipped: true } : c,
        );
        const left = remaining(cards);
        const winner =
          card.color === "blackout"
            ? otherTeam(s.active)
            : left.signal === 0
              ? "signal"
              : left.cobalt === 0
                ? "cobalt"
                : undefined;
        const next = { ...s, cards, guesses: s.guesses - 1 };
        if (winner)
          return {
            data: {
              ...next,
              stage: "RESULT",
              winner,
              deadline: now + 5000,
              note:
                card.color === "blackout"
                  ? "Blackout Trap!"
                  : "All agents found.",
            },
            effect: "gavel",
          };
        if (card.color !== s.active || next.guesses === 0)
          return {
            data: nextTurn(
              next,
              now,
              `${card.word} · ${colorNames[card.color]}`,
            ),
            effect: "card",
          };
        return {
          data: {
            ...next,
            note: `${card.word} · Correct. Guess again or end your turn.`,
          },
          effect: "card",
        };
      }
    }
    return { data: s };
  },
  playerView(s, id) {
    const team = teamOf(s.teams, id);
    const handler = team !== undefined && s.handlers[team] === id;
    return {
      ...s,
      cards: s.cards.map((c) => ({
        ...c,
        color: handler || c.flipped ? c.color : undefined,
      })),
    };
  },
  TV,
  Phone,
});
