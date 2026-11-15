import { useState } from "react";
import { Flame, Users, Zap } from "@/components/ArcadeIcons";
import { findPlayer, nameOf, PlayerBadge, Timer } from "@/components/GameUI";
import { keyed, orderBy, roll, shuffle, type GameId } from "@/lib/types";
import {
  allOnlineActed,
  defineGame,
  type GameContext,
  type GameResult,
  type ScreenProps,
} from "@/games/types";

type Mode = "deduction" | "trivia";
type Question = { text: string; correct: string; options: string[] };
type Challenge =
  | { kind: "memory"; pattern: number[] }
  | { kind: "math"; a: number; b: number; c: number }
  | { kind: "wire"; color: string; clue: string };
type Stage =
  | "SECRET"
  | "COUNTDOWN"
  | "EXPOSE"
  | "QUESTION"
  | "MEMORIZE"
  | "DUNGEON"
  | "RESULT";
type Answer = { value: string; passed: boolean };
type State = {
  mode: Mode;
  ids: string[];
  stage: Stage;
  deadline: number;
  round: number;
  total: number;
  physical: string[];
  questions: Question[];
  roles: string[];
  ballots: Record<string, string>;
  points: Record<string, number>;
  delta: Record<string, number>;
  trapped: string[];
  attempts: Record<string, Answer>;
  challenge?: Challenge;
};
type View = Pick<
  State,
  | "mode"
  | "ids"
  | "stage"
  | "deadline"
  | "round"
  | "total"
  | "points"
  | "delta"
  | "trapped"
> & {
  prompt?: string;
  faker?: string;
  isFaker: boolean;
  myVote?: string;
  safe?: boolean;
  attempts: number;
  votes: number;
  choices?: string[];
  correct?: string;
  challenge?: { kind: Challenge["kind"]; clue?: string; pattern?: number[] };
};

const physicalPrompts = [
  "Hold up one to five fingers. How many slices of pizza could you eat right now?",
  "Make a face that shows how scared you are of spiders.",
  "Mime the instrument you’d play in a band.",
  "Point to the person most likely to survive a zombie movie.",
  "Show with your hands how large your ideal pet would be.",
  "Make the face you would make after tasting an extremely sour lemon.",
  "Pose like the animal you would most hate to chase you.",
  "Hold up one to five fingers. How many alarms do you normally set?",
  "Use your arms to show how far away you'd stand from a goose.",
  "Point to someone who would be a terrible secret agent.",
  "Mime the sport you’re most confident you’d win.",
  "Make the face you would use to get a friend’s attention across a quiet library.",
  "Hold up one to five fingers. How much do you trust a self-driving skateboard?",
  "Pretend you just spotted your favorite musician at the grocery store.",
];
const questions: Question[] = [
  {
    text: "What is the capital of New Zealand?",
    correct: "Wellington",
    options: ["Auckland", "Christchurch", "Wellington", "Queenstown"],
  },
  {
    text: "Which planet has the shortest day?",
    correct: "Jupiter",
    options: ["Mercury", "Earth", "Jupiter", "Neptune"],
  },
  {
    text: "How many sides does a dodecagon have?",
    correct: "12",
    options: ["10", "12", "16", "20"],
  },
  {
    text: "Which element has the chemical symbol Ag?",
    correct: "Silver",
    options: ["Argon", "Silver", "Gold", "Aluminum"],
  },
  {
    text: "How many strings does a standard violin have?",
    correct: "4",
    options: ["3", "4", "5", "6"],
  },
  {
    text: "What is the highest possible score from one dart on a standard board?",
    correct: "60",
    options: ["50", "55", "60", "100"],
  },
  {
    text: "What country has the city of Porto?",
    correct: "Portugal",
    options: ["Spain", "Brazil", "Portugal", "Italy"],
  },
  {
    text: "Which animal is the largest living lizard?",
    correct: "Komodo dragon",
    options: ["Green iguana", "Gila monster", "Komodo dragon", "Chameleon"],
  },
  {
    text: "Who wrote Frankenstein?",
    correct: "Mary Shelley",
    options: ["Mary Shelley", "Jane Austen", "Bram Stoker", "Emily Brontë"],
  },
  {
    text: "What does the Roman numeral XL represent?",
    correct: "40",
    options: ["15", "40", "60", "90"],
  },
  {
    text: "How many players from one team are on the court in standard basketball?",
    correct: "5",
    options: ["4", "5", "6", "7"],
  },
  {
    text: "Which chess piece can jump over another piece on an ordinary move?",
    correct: "Knight",
    options: ["Rook", "Knight", "Bishop", "Queen"],
  },
  {
    text: "Which number is the only even prime?",
    correct: "2",
    options: ["0", "2", "4", "6"],
  },
  {
    text: "Which gas makes up most of Earth's dry atmosphere?",
    correct: "Nitrogen",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
  },
  {
    text: "Which of these animals is a marsupial?",
    correct: "Wombat",
    options: ["Wombat", "Platypus", "Echidna", "Sloth"],
  },
  {
    text: "What is the first letter of the Greek alphabet?",
    correct: "Alpha",
    options: ["Beta", "Delta", "Alpha", "Omega"],
  },
];
const wireOptions = [
  { color: "Red", clue: "Cut the wire the color of a stop sign." },
  { color: "Blue", clue: "Cut the wire the color of a clear daytime sky." },
  { color: "Yellow", clue: "Cut the wire the color of a ripe banana peel." },
  { color: "Green", clue: "Cut the wire the color of a fresh lime." },
];
const settings = {
  deduction: {
    id: "fakin-it",
    title: "Fakin’ It",
    category: "SOCIAL DEDUCTION",
    detail: "Copy the room. One player never got the prompt.",
    accent: "#ff8752",
  },
  trivia: {
    id: "trivia-dungeon",
    title: "Trivia Dungeon",
    category: "QUIZ & SURVIVAL",
    detail: "Answer fast or face a challenge on the Dungeon Floor.",
    accent: "#d9ff00",
  },
} satisfies Record<
  Mode,
  {
    id: GameId;
    title: string;
    category: string;
    detail: string;
    accent: string;
  }
>;

const tiles = [1, 2, 3, 4, 5, 6];
function makeChallenge(round: number): Challenge {
  if (round % 3 === 0)
    return { kind: "memory", pattern: shuffle(tiles).slice(0, 5) };
  if (round % 3 === 1)
    return { kind: "math", a: 3 + roll(10), b: 2 + roll(7), c: 2 + roll(8) };
  return { kind: "wire", ...wireOptions[roll(wireOptions.length)] };
}
function create({ ids, now }: GameContext, mode: Mode): State {
  const deduction = mode === "deduction";
  return {
    mode,
    ids,
    stage: deduction ? "SECRET" : "QUESTION",
    deadline: now + (deduction ? 8500 : 13500),
    round: 0,
    total: deduction ? Math.max(3, ids.length) : 6,
    physical: shuffle(physicalPrompts),
    questions: shuffle(questions).map((q) => ({
      ...q,
      options: shuffle(q.options),
    })),
    roles: shuffle(ids),
    ballots: {},
    points: keyed(ids, () => 0),
    delta: {},
    trapped: [],
    attempts: {},
  };
}
function score(data: State, now: number): GameResult<State> {
  const delta = keyed(data.ids, () => 0);
  if (data.mode === "deduction") {
    const faker = data.roles[data.round % data.roles.length];
    for (const id of data.ids) {
      if (data.ballots[id] === faker) delta[id] += 400;
      else if (data.ballots[id]) delta[faker] += 250;
    }
  } else {
    for (const id of data.ids)
      delta[id] = data.trapped.includes(id)
        ? data.attempts[id]?.passed
          ? 0
          : -500
        : 600;
  }
  return {
    data: {
      ...data,
      stage: "RESULT",
      delta,
      deadline: now + 6500,
      points: keyed(data.ids, (id) => data.points[id] + delta[id]),
    },
    effect: "coin",
  };
}
function correctAttempt(challenge: Challenge, input: string) {
  if (challenge.kind === "math")
    return (
      /^-?\d+$/.test(input) &&
      Number(input) === challenge.a * challenge.b - challenge.c
    );
  if (challenge.kind === "wire") return input === challenge.color;
  return input === challenge.pattern.join(",");
}
function step(
  data: State,
  ctx: GameContext,
  event?: { player: string; type: string; value?: unknown },
): GameResult<State> {
  const { now } = ctx;
  const expired = now >= data.deadline;
  if (data.stage === "SECRET" && expired)
    return {
      data: { ...data, stage: "COUNTDOWN", deadline: now + 3000 },
      effect: "tick",
    };
  if (data.stage === "COUNTDOWN" && expired)
    return {
      data: { ...data, stage: "EXPOSE", deadline: now + 22000 },
      effect: "gavel",
    };
  if (data.stage === "EXPOSE") {
    const faker = data.roles[data.round % data.roles.length];
    const voters = ctx.ids.filter((id) => id !== faker);
    if (expired || allOnlineActed({ ...ctx, ids: voters }, data.ballots))
      return score(data, now);
    if (
      event?.type === "suspect" &&
      voters.includes(event.player) &&
      typeof event.value === "string" &&
      event.value !== event.player &&
      data.ids.includes(event.value)
    ) {
      return {
        data: {
          ...data,
          ballots: { ...data.ballots, [event.player]: event.value },
        },
      };
    }
  }
  if (data.stage === "QUESTION") {
    const question = data.questions[data.round];
    if (expired || allOnlineActed(ctx, data.ballots)) {
      const trapped = data.ids.filter(
        (id) => data.ballots[id] !== question.correct,
      );
      const challenge = makeChallenge(data.round);
      if (!trapped.length) return score({ ...data, trapped }, now);
      const memory = challenge.kind === "memory";
      return {
        data: {
          ...data,
          trapped,
          challenge,
          stage: memory ? "MEMORIZE" : "DUNGEON",
          deadline: now + (memory ? 4200 : 15000),
        },
        effect: "gavel",
      };
    }
    if (
      event?.type === "trivia" &&
      typeof event.value === "string" &&
      question.options.includes(event.value) &&
      !data.ballots[event.player]
    ) {
      return {
        data: {
          ...data,
          ballots: { ...data.ballots, [event.player]: event.value },
        },
      };
    }
  }
  if (data.stage === "MEMORIZE" && expired)
    return {
      data: { ...data, stage: "DUNGEON", deadline: now + 15000 },
      effect: "tick",
    };
  if (data.stage === "DUNGEON" && data.challenge) {
    if (expired || allOnlineActed({ ...ctx, ids: data.trapped }, data.attempts))
      return score(data, now);
    if (
      event?.type === "escape-dungeon" &&
      data.trapped.includes(event.player) &&
      typeof event.value === "string" &&
      !data.attempts[event.player]
    ) {
      const value = event.value.trim().slice(0, 40);
      return {
        data: {
          ...data,
          attempts: {
            ...data.attempts,
            [event.player]: {
              value,
              passed: correctAttempt(data.challenge, value),
            },
          },
        },
      };
    }
  }
  if (data.stage === "RESULT" && expired) {
    const round = data.round + 1;
    if (round === data.total)
      return { data, rankings: orderBy(data.ids, (id) => data.points[id]) };
    const deduction = data.mode === "deduction";
    return {
      data: {
        ...data,
        round,
        stage: deduction ? "SECRET" : "QUESTION",
        deadline: now + (deduction ? 8500 : 13500),
        trapped: [],
        attempts: {},
        ballots: {},
        challenge: undefined,
        delta: {},
      },
      effect: "card",
    };
  }
  return { data };
}

function project(data: State, id: string): View {
  const { mode, ids, stage, deadline, round, total, points, delta, trapped } =
    data;
  const faker = data.roles[round % data.roles.length];
  const isFaker = mode === "deduction" && faker === id;
  const physical = mode === "deduction";
  const question = data.questions[round];
  const onTV = id === "";
  const challenge =
    data.challenge && (onTV || trapped.includes(id))
      ? {
          kind: data.challenge.kind,
          clue:
            data.challenge.kind === "wire"
              ? data.challenge.clue
              : data.challenge.kind === "math"
                ? `${data.challenge.a} × ${data.challenge.b} − ${data.challenge.c} = ?`
                : undefined,
          pattern:
            data.challenge.kind === "memory" && stage === "MEMORIZE"
              ? data.challenge.pattern
              : undefined,
        }
      : undefined;
  const prompt = physical
    ? (!isFaker && !onTV) || stage === "EXPOSE" || stage === "RESULT"
      ? data.physical[round % data.physical.length]
      : undefined
    : question.text;
  return {
    mode,
    ids,
    stage,
    deadline,
    round,
    total,
    points,
    delta,
    trapped,
    prompt,
    isFaker,
    faker: physical && stage === "RESULT" ? faker : undefined,
    myVote: data.ballots[id],
    safe: data.attempts[id]?.passed,
    attempts: Object.keys(data.attempts).length,
    votes: Object.keys(data.ballots).length,
    choices: physical ? undefined : question.options,
    correct: !physical && stage !== "QUESTION" ? question.correct : undefined,
    challenge,
  };
}

function Pattern({ sequence }: { sequence: number[] }) {
  return (
    <div className="tile-sequence">
      {sequence.map((tile, i) => (
        <b key={i}>{tile}</b>
      ))}
    </div>
  );
}
function TV({ data, now, room }: ScreenProps<State>) {
  const v = project(data, "");
  const floor = v.stage === "MEMORIZE" || v.stage === "DUNGEON";
  const label =
    v.stage === "SECRET"
      ? "Read your phones"
      : floor
        ? "Dungeon Floor"
        : v.stage === "COUNTDOWN"
          ? "Pose on GO"
          : v.stage === "EXPOSE"
            ? "GO! Find the faker"
            : v.stage === "RESULT"
              ? "Round results"
              : "Pick your answer";
  return (
    <div className="game-columns">
      <section className="panel playing-stage">
        <div className="split">
          <span className="eyebrow">
            ROUND {v.round + 1} / {v.total}
          </span>
          <Timer deadline={v.deadline} now={now} />
        </div>
        <div className="black-prompt">
          <h2>{label}</h2>
          {v.prompt && <p>{v.prompt}</p>}
        </div>
        {v.stage === "COUNTDOWN" && (
          <strong className="countdown-number">
            {Math.max(1, Math.ceil((v.deadline - now) / 1000))}
          </strong>
        )}
        {v.choices && !floor && (
          <div className="entry-grid">
            {v.choices.map((choice) => (
              <div
                key={choice}
                data-truth={choice === v.correct}
                className="white-card"
              >
                {choice}
              </div>
            ))}
          </div>
        )}
        {floor && (
          <>
            <p>
              {v.trapped.length} players on the Dungeon Floor · {v.attempts}{" "}
              attempts
            </p>
            {v.challenge?.pattern && <Pattern sequence={v.challenge.pattern} />}
            {v.challenge?.clue && <h2>{v.challenge.clue}</h2>}
            {v.stage === "DUNGEON" && v.challenge?.kind === "memory" && (
              <p>Enter the five tiles in order on your phone.</p>
            )}
          </>
        )}
        {v.stage === "EXPOSE" && <p>{v.votes} suspects submitted</p>}
        {v.faker && (
          <div className="notice">The faker was {nameOf(room, v.faker)}.</div>
        )}
      </section>
      <aside className="panel game-sidebar">
        <h3>Scoreboard</h3>
        {orderBy(data.ids, (id) => data.points[id]).map((id) => (
          <PlayerBadge
            key={id}
            player={findPlayer(room, id)}
            reaction={v.faker === id ? "shocked" : "idle"}
            detail={`${data.points[id]} pts${v.delta[id] ? ` · ${v.delta[id] > 0 ? "+" : ""}${v.delta[id]}` : ""}`}
          />
        ))}
      </aside>
    </div>
  );
}

function Survival({
  challenge,
  send,
}: {
  challenge: NonNullable<View["challenge"]>;
  send: (type: string, value: string) => void;
}) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [answer, setAnswer] = useState("");
  if (challenge.kind === "memory")
    return (
      <div className="controller-stack">
        <Pattern sequence={sequence} />
        <div className="tile-sequence">
          {tiles.map((tile) => (
            <button
              className="secondary"
              disabled={sequence.length >= 5}
              key={tile}
              onClick={() => setSequence([...sequence, tile])}
            >
              {tile}
            </button>
          ))}
        </div>
        <div className="actions">
          <button className="secondary" onClick={() => setSequence([])}>
            Reset
          </button>
          <button
            className="primary"
            disabled={sequence.length !== 5}
            onClick={() => send("escape-dungeon", sequence.join(","))}
          >
            Submit pattern
          </button>
        </div>
      </div>
    );
  if (challenge.kind === "wire")
    return (
      <>
        <p>{challenge.clue}</p>
        <div className="entry-grid">
          {wireOptions.map((wire) => (
            <button
              className="secondary"
              key={wire.color}
              onClick={() => send("escape-dungeon", wire.color)}
            >
              {wire.color} wire
            </button>
          ))}
        </div>
      </>
    );
  return (
    <form
      className="controller-stack"
      onSubmit={(e) => {
        e.preventDefault();
        send("escape-dungeon", answer);
      }}
    >
      <h2>{challenge.clue}</h2>
      <input
        aria-label="Math answer"
        required
        value={answer}
        maxLength={8}
        inputMode="numeric"
        onChange={(e) => setAnswer(e.target.value)}
      />
      <button className="primary" type="submit">
        Submit answer
      </button>
    </form>
  );
}

function Phone({ data: v, me, now, room, send }: ScreenProps<View>) {
  const stuck = v.trapped.includes(me);
  const floor = v.stage === "MEMORIZE" || v.stage === "DUNGEON";
  return (
    <div className="controller-stack">
      <div className="split">
        <span className="eyebrow">
          ROUND {v.round + 1} · {v.points[me]} POINTS
        </span>
        <Timer deadline={v.deadline} now={now} />
      </div>
      {v.mode === "deduction" && (
        <>
          {v.stage === "SECRET" || v.stage === "COUNTDOWN" ? (
            <>
              <h2>{v.isFaker ? "YOU ARE THE FAKER — BLEND IN!" : v.prompt}</h2>
              <p>Keep this to yourself. Look at the TV for the countdown.</p>
            </>
          ) : (
            <h2>{v.prompt}</h2>
          )}
          {v.stage === "EXPOSE" &&
            (v.isFaker ? (
              <p>Stay in character while everyone guesses.</p>
            ) : (
              <>
                <h2>Who was faking?</h2>
                {v.ids
                  .filter((id) => id !== me)
                  .map((id) => (
                    <button
                      key={id}
                      className="white-card"
                      aria-pressed={v.myVote === id}
                      onClick={() => send("suspect", id)}
                    >
                      <PlayerBadge player={findPlayer(room, id)} />
                    </button>
                  ))}
              </>
            ))}
          {v.faker && <p>The faker was {nameOf(room, v.faker)}.</p>}
        </>
      )}
      {v.mode === "trivia" && (
        <>
          {v.stage === "QUESTION" && (
            <>
              <h2>{v.prompt}</h2>
              {v.choices?.map((choice) => (
                <button
                  key={choice}
                  className="white-card"
                  disabled={Boolean(v.myVote)}
                  aria-pressed={v.myVote === choice}
                  onClick={() => send("trivia", choice)}
                >
                  {choice}
                </button>
              ))}
            </>
          )}
          {floor && (
            <>
              <h2>{stuck ? "Dungeon Floor" : "You’re safe."}</h2>
              <p>The correct answer was {v.correct}.</p>
            </>
          )}
          {stuck && v.stage === "MEMORIZE" && v.challenge?.pattern && (
            <>
              <p>Memorize this sequence.</p>
              <Pattern sequence={v.challenge.pattern} />
            </>
          )}
          {stuck &&
            v.stage === "DUNGEON" &&
            v.challenge &&
            (v.safe === undefined ? (
              <Survival key={v.round} challenge={v.challenge} send={send} />
            ) : (
              <div className="notice">
                {v.safe ? "You escaped." : "That didn’t work. −500 points."}
              </div>
            ))}
          {v.stage === "RESULT" && <p>Correct answer · {v.correct}</p>}
        </>
      )}
      {v.stage === "RESULT" && (
        <div className="notice">
          <Zap size={16} /> This round {v.delta[me] > 0 ? "+" : ""}
          {v.delta[me]} points
        </div>
      )}
    </div>
  );
}

export function deductionTriviaGame(mode: Mode) {
  const { id, title, category, detail, accent } = settings[mode];
  return defineGame<State, View>({
    id,
    title,
    category,
    description: detail,
    accent,
    icon: mode === "trivia" ? Flame : Users,
    create: (ctx) => create(ctx, mode),
    step,
    playerView: project,
    TV,
    Phone,
  });
}
