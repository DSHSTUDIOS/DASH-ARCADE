import { useState } from "react";
import { defineGame, type ScreenProps } from "../types";
import { shuffle, type TeamId, type TeamRosters } from "@/lib/types";
import { SignalIcon } from "./icons";
import { spyWords } from "./word-bank";
import {
  oneWord,
  otherTeam,
  TEAM_IDS,
  teamNames,
  teamOf,
  teamResult,
  teamResultLabel,
  teamRosters,
  TeamScoreboard,
} from "./shared";

type Score = Record<TeamId, number>;
type Stage = "ENCODE" | "GUESS" | "REVEAL" | "RESULT";
type History = {
  team: TeamId;
  code: number[];
  clues: string[];
  winner?: TeamId;
};
type State = {
  teams: TeamRosters;
  keywords: Record<TeamId, string[]>;
  code: number[];
  stage: Stage;
  turn: number;
  deadline: number;
  clues: string[];
  guesses: Partial<Record<TeamId, number[]>>;
  score: Score;
  intercepts: Score;
  history: History[];
};
type View = Omit<State, "keywords" | "code" | "guesses"> & {
  keywords: string[];
  secretCode?: number[];
  attempted: boolean;
};
const slots = [1, 2, 3, 4];
const turns = 8;
const activeTeam = (s: Pick<State, "turn">): TeamId =>
  s.turn % 2 === 0 ? "signal" : "cobalt";
function encoder(s: Pick<State, "teams" | "turn">) {
  const team = s.teams[activeTeam(s)];
  return team[Math.floor(s.turn / 2) % team.length];
}
function validClues(value: unknown, keywords: string[]) {
  if (!Array.isArray(value) || value.length !== 3) return;
  const clues = value.map(oneWord);
  const normalized = clues.map((word) => word.toLowerCase());
  if (
    clues.some((word) => !word) ||
    new Set(normalized).size !== 3 ||
    normalized.some((word) =>
      keywords.some((key) => key.toLowerCase() === word),
    )
  )
    return;
  return clues;
}
function validCode(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    new Set(value).size === 3 &&
    value.every((n) => typeof n === "number" && slots.includes(n))
  );
}
function reveal(s: State, now: number, winner?: TeamId): State {
  const active = activeTeam(s);
  const intercept = winner !== undefined && winner !== active;
  return {
    ...s,
    stage: "REVEAL",
    deadline: now + 5000,
    score: winner ? { ...s.score, [winner]: s.score[winner] + 1 } : s.score,
    intercepts: intercept
      ? { ...s.intercepts, [winner]: s.intercepts[winner] + 1 }
      : s.intercepts,
    history: s.clues.length
      ? [...s.history, { team: active, code: s.code, clues: s.clues, winner }]
      : s.history,
  };
}

function HistoryLog({ history }: { history: History[] }) {
  return (
    <div className="team-pair signal-history">
      {TEAM_IDS.map((team) => (
        <article key={team} className="team-box" data-team={team}>
          <header>
            <h3>{teamNames[team]} log</h3>
          </header>
          <ol>
            {slots.map((slot) => (
              <li key={slot}>
                <b>{slot}</b>
                <span>
                  {history
                    .flatMap((entry) => {
                      const index = entry.code.indexOf(slot);
                      return entry.team === team && index !== -1
                        ? [entry.clues[index]]
                        : [];
                    })
                    .join(" · ") || "—"}
                </span>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}

function Transmission({
  data,
}: {
  data: Pick<State, "stage" | "clues" | "score" | "intercepts" | "history">;
}) {
  const last = data.history.at(-1);
  return (
    <div className="team-callout">
      <strong>
        {data.stage === "RESULT"
          ? teamResultLabel(teamResult(data.score, data.intercepts))
          : data.stage === "ENCODE"
            ? "Waiting for the Encoder"
            : data.stage === "GUESS"
              ? "Decoders and interceptors, send your code"
              : !data.clues.length
                ? "No transmission sent"
                : last?.winner
                  ? `${teamNames[last.winner]} scored`
                  : "Transmission missed"}
      </strong>
      {!!data.clues.length && (
        <ol className="signal-clues">
          {data.clues.map((clue, i) => (
            <li key={i}>{clue}</li>
          ))}
        </ol>
      )}
      {data.stage === "REVEAL" && data.clues.length > 0 && last && (
        <span>Code: {last.code.join(" — ")}</span>
      )}
    </div>
  );
}
function TV({ data, now }: ScreenProps<State>) {
  return (
    <section className="team-game team-surface">
      <TeamScoreboard scores={data.score} deadline={data.deadline} now={now}>
        Transmission {data.turn + 1} / {turns} · {teamNames[activeTeam(data)]}
      </TeamScoreboard>
      <Transmission data={data} />
      <HistoryLog history={data.history} />
    </section>
  );
}

function EncodeForm({
  data,
  send,
}: {
  data: View;
  send: ScreenProps<View>["send"];
}) {
  const [clues, setClues] = useState(["", "", ""]);
  return (
    <form
      className="team-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (validClues(clues, data.keywords)) send("encode", clues);
      }}
    >
      <p>
        Give three distinct one-word clues in order. Keep the numbered keywords
        out of your clues.
      </p>
      {data.secretCode?.map((slot, i) => (
        <label key={slot}>
          Clue {i + 1} · Slot {slot}
          <input
            maxLength={28}
            value={clues[i]}
            onChange={(e) =>
              setClues(
                clues.map((clue, index) =>
                  index === i ? e.target.value : clue,
                ),
              )
            }
          />
        </label>
      ))}
      <button className="primary" disabled={!validClues(clues, data.keywords)}>
        Send transmission
      </button>
    </form>
  );
}
function CodeForm({ send }: { send: ScreenProps<View>["send"] }) {
  const [digits, setDigits] = useState<number[]>([]);
  return (
    <div className="team-stack">
      <p>Enter three distinct digits. Your team gets one attempt.</p>
      <output aria-label="Selected digits">
        {digits.length ? digits.join(" — ") : "— — —"}
      </output>
      <div className="signal-digits">
        {slots.map((n) => (
          <button
            type="button"
            className="secondary"
            key={n}
            disabled={digits.includes(n) || digits.length === 3}
            onClick={() => setDigits([...digits, n])}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="actions">
        <button
          className="secondary"
          onClick={() => setDigits([])}
          disabled={!digits.length}
        >
          Clear
        </button>
        <button
          className="primary"
          disabled={!validCode(digits)}
          onClick={() => send("decode", digits)}
        >
          Transmit code
        </button>
      </div>
    </div>
  );
}
function Phone({ data, me, now, send }: ScreenProps<View>) {
  const team = teamOf(data.teams, me);
  const active = activeTeam(data);
  const sender = encoder(data) === me;
  const canGuess = data.stage === "GUESS" && !data.attempted && !sender;
  return (
    <div className="team-stack">
      <TeamScoreboard scores={data.score} deadline={data.deadline} now={now}>
        {sender ? "Encoder" : team === active ? "Decoder" : "Interceptor"}
      </TeamScoreboard>
      <ol className="signal-keywords" aria-label="Your team’s secret keywords">
        {data.keywords.map((word, i) => (
          <li key={word}>
            <b>{i + 1}</b> {word}
          </li>
        ))}
      </ol>
      <Transmission data={data} />
      {data.stage === "ENCODE" && data.secretCode && (
        <EncodeForm key={data.turn} data={data} send={send} />
      )}
      {canGuess && <CodeForm key={data.turn} send={send} />}
      {data.stage === "GUESS" && data.attempted && (
        <p>Code sent. Watch the TV.</p>
      )}
    </div>
  );
}
export default defineGame<State, View>({
  id: "signal-jam",
  team: true,
  title: "Signal Jam",
  category: "TEAM CODE INTERCEPTION",
  description:
    "Encode clues for your crew. Decode or intercept the signal before it goes quiet.",
  icon: SignalIcon,
  accent: "#ff4f00",
  create(context) {
    const words = shuffle(spyWords).slice(0, 8);
    return {
      teams: teamRosters(context),
      keywords: { signal: words.slice(0, 4), cobalt: words.slice(4) },
      code: shuffle(slots).slice(0, 3),
      stage: "ENCODE",
      turn: 0,
      deadline: context.now + 45000,
      clues: [],
      guesses: {},
      score: { signal: 0, cobalt: 0 },
      intercepts: { signal: 0, cobalt: 0 },
      history: [],
    };
  },
  step(s, { now }, event) {
    const active = activeTeam(s);
    const expired = now >= s.deadline;
    const team = event && teamOf(s.teams, event.player);
    if (s.stage === "ENCODE") {
      if (expired) return { data: reveal(s, now), effect: "card" };
      if (event?.player === encoder(s) && event.type === "encode") {
        const clues = validClues(event.value, s.keywords[active]);
        if (clues)
          return {
            data: { ...s, clues, stage: "GUESS", deadline: now + 28000 },
            effect: "card",
          };
      }
    } else if (s.stage === "GUESS") {
      if (expired) return { data: reveal(s, now), effect: "card" };
      if (
        team &&
        event?.player !== encoder(s) &&
        event?.type === "decode" &&
        !s.guesses[team] &&
        validCode(event.value)
      ) {
        const next = { ...s, guesses: { ...s.guesses, [team]: event.value } };
        if (event.value.every((digit, i) => digit === s.code[i]))
          return {
            data: reveal(next, now, team),
            effect: team === active ? "coin" : "gavel",
          };
        if (next.guesses[otherTeam(team)])
          return { data: reveal(next, now), effect: "card" };
        return { data: next };
      }
    } else if (s.stage === "REVEAL" && expired) {
      return {
        data:
          s.turn === turns - 1
            ? { ...s, stage: "RESULT", deadline: now + 4500 }
            : {
                ...s,
                turn: s.turn + 1,
                stage: "ENCODE",
                deadline: now + 45000,
                code: shuffle(slots).slice(0, 3),
                clues: [],
                guesses: {},
              },
      };
    } else if (s.stage === "RESULT" && expired)
      return { data: s, teamWinner: teamResult(s.score, s.intercepts) };
    return { data: s };
  },
  playerView(s, id) {
    const team = teamOf(s.teams, id);
    const { keywords, code, guesses, ...view } = s;
    return {
      ...view,
      keywords: team ? keywords[team] : [],
      secretCode: s.stage === "ENCODE" && id === encoder(s) ? code : undefined,
      attempted: !!(team && guesses[team]),
    };
  },
  TV,
  Phone,
});
