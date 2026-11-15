import { useState } from "react";
import { Palette, Trophy } from "@/components/ArcadeIcons";
import { findPlayer, nameOf, PlayerBadge, Timer } from "@/components/GameUI";
import TouchCanvas from "@/components/TouchCanvas";
import {
  keyed,
  roll,
  shuffle,
  validStroke,
  type GameId,
  type Stroke,
} from "@/lib/types";
import {
  allOnlineActed,
  defineGame,
  type GameContext,
  type GameResult,
  type ScreenProps,
} from "@/games/types";

type Art = { id: number; artist: string; prompt: string; strokes: Stroke[] };
type Slogan = { id: number; writer: string; text: string };
type Kit = { art: number[]; slogans: number[] };
type Design = { art: number; slogan: number; shirt: number };
type State = {
  ids: string[];
  stage: "DRAW" | "WRITE" | "COMBINE" | "BRACKET" | "RESULT";
  deadline: number;
  art: Art[];
  slogans: Slogan[];
  kits: Record<string, Kit>;
  ready: Record<string, boolean>;
  designs: Record<string, Design>;
  queue: string[];
  next: string[];
  eliminated: string[];
  bracketRound: number;
  match: string[];
  ballots: Record<string, string>;
  wins: Record<string, number>;
  votes: Record<string, number>;
  matchWinner?: string;
  winner?: string;
};
type Shirt = { artwork: Art; slogan: Slogan; color: number };
type View = Pick<
  State,
  | "stage"
  | "deadline"
  | "bracketRound"
  | "match"
  | "votes"
  | "wins"
  | "winner"
  | "matchWinner"
> & {
  ownArt: Art[];
  mySlogans: Slogan[];
  art: Art[];
  slogans: Slogan[];
  done: boolean;
  ownDesign?: Design;
  myVote?: string;
  shirts: Record<string, Shirt>;
};
export type CanvasMashupConfig = {
  id: GameId;
  title: string;
  category: string;
  description: string;
  accent: string;
  prompts: string[];
};
const shirtColors = [
  "#f4f0ea",
  "#ff5ca8",
  "#d9ff00",
  "#77a5ff",
  "#00d68f",
  "#ff8447",
];
const reserveSlips = [
  "I NEED A SNACK",
  "PLEASE DO NOT PERCEIVE ME",
  "WORLD’S OKAYEST HERO",
  "OFF DUTY UNTIL TUESDAY",
  "ABSOLUTELY A PROFESSIONAL",
  "THE FLOOR IS A SUGGESTION",
  "ASK ME ABOUT MY OTHER SHIRT",
  "THE CLUB HAS NO RULES",
];
const outline = [
  [0.19, 0.56],
  [0.22, 0.38],
  [0.32, 0.33],
  [0.35, 0.19],
  [0.45, 0.27],
  [0.56, 0.27],
  [0.65, 0.19],
  [0.7, 0.35],
  [0.79, 0.41],
  [0.82, 0.59],
  [0.72, 0.72],
  [0.54, 0.78],
  [0.35, 0.76],
  [0.22, 0.68],
  [0.19, 0.56],
];
const reserveArt: Stroke[] = [
  outline,
  [
    [0.37, 0.51],
    [0.4, 0.51],
  ],
  [
    [0.62, 0.51],
    [0.65, 0.51],
  ],
  [
    [0.43, 0.61],
    [0.5, 0.66],
    [0.57, 0.61],
  ],
].flatMap((line, i) =>
  line
    .slice(1)
    .map(([x2, y2], j) => ({
      x1: line[j][0],
      y1: line[j][1],
      x2,
      y2,
      color: i === 0 ? "#ef446e" : "#201b37",
      width: 10,
    })),
);

function create(ctx: GameContext, config: CanvasMashupConfig): State {
  const { ids, now } = ctx;
  const prompts = shuffle(config.prompts);
  const art = ids.flatMap((artist, i) =>
    [0, 1].map((j) => ({
      artist,
      id: i * 2 + j,
      prompt: prompts[(i * 2 + j) % prompts.length],
      strokes: [],
    })),
  );
  return {
    ids,
    stage: "DRAW",
    deadline: now + 55000,
    art,
    slogans: [],
    kits: {},
    ready: {},
    designs: {},
    queue: [],
    next: [],
    eliminated: [],
    bracketRound: 1,
    match: [],
    ballots: {},
    wins: keyed(ids, () => 0),
    votes: {},
  };
}
function findShirt(data: State, id: string): Shirt | undefined {
  const choice = data.designs[id];
  if (!choice) return;
  const artwork = data.art.find((art) => art.id === choice.art);
  const slogan = data.slogans.find((slogan) => slogan.id === choice.slogan);
  if (artwork && slogan) return { artwork, slogan, color: choice.shirt };
}
function deal(data: State, now: number): State {
  const art = data.art.some((item) => item.strokes.length)
    ? [...data.art]
    : [
        ...data.art,
        { id: -1, artist: "", prompt: "Print shop cat", strokes: reserveArt },
      ];
  const slogans = [
    ...data.slogans,
    ...reserveSlips.map((text, i) => ({ id: -(i + 1), writer: "", text })),
  ];
  const kits = keyed(data.ids, (id) => {
    const eligibleArt = art.filter(
      (work) => work.artist !== id && work.strokes.length,
    );
    const fallback = {
      id: -1,
      artist: "",
      prompt: "Print shop cat",
      strokes: reserveArt,
    };
    if (!eligibleArt.length) {
      if (!art.some((work) => work.id === fallback.id)) art.push(fallback);
      eligibleArt.push(fallback);
    }
    const written = shuffle(
      slogans.filter((item) => item.writer && item.writer !== id),
    ).slice(0, 4);
    const reserves = shuffle(slogans.filter((item) => !item.writer)).slice(
      0,
      4 - written.length,
    );
    return {
      art: shuffle(eligibleArt)
        .slice(0, 3)
        .map((work) => work.id),
      slogans: [...written, ...reserves].map((slogan) => slogan.id),
    };
  });
  return {
    ...data,
    art,
    slogans,
    kits,
    ready: {},
    stage: "COMBINE",
    deadline: now + 45000,
  };
}

function startBracket(data: State, now: number): State {
  const designs = keyed(
    data.ids,
    (id) =>
      data.designs[id] ?? {
        art: data.kits[id].art[0],
        slogan: data.kits[id].slogans[0],
        shirt: roll(shirtColors.length),
      },
  );
  return nextMatch(
    { ...data, designs, queue: shuffle(data.ids), next: [] },
    now,
  );
}
function nextMatch(data: State, now: number): State {
  let { queue, next, bracketRound } = data;
  if (queue.length === 1) {
    next = [...next, ...queue];
    queue = [];
  }
  if (queue.length === 0) {
    if (next.length === 1)
      return {
        ...data,
        match: next,
        winner: next[0],
        stage: "RESULT",
        deadline: now + 8000,
      };
    queue = next;
    next = [];
    bracketRound++;
  }
  return {
    ...data,
    queue: queue.slice(2),
    next,
    match: queue.slice(0, 2),
    bracketRound,
    stage: "BRACKET",
    deadline: now + 20000,
    ballots: {},
    votes: {},
    matchWinner: undefined,
  };
}

function step(
  data: State,
  ctx: GameContext,
  event?: { player: string; type: string; value?: unknown },
): GameResult<State> {
  const { now } = ctx;
  const expired = now >= data.deadline;
  if (data.stage === "DRAW") {
    if (expired || allOnlineActed(ctx, data.ready))
      return {
        data: { ...data, stage: "WRITE", ready: {}, deadline: now + 50000 },
        effect: "card",
      };
    if (event?.type === "finished-drawing")
      return {
        data: { ...data, ready: { ...data.ready, [event.player]: true } },
      };
    if (
      event?.type === "art-stroke" &&
      event.value &&
      typeof event.value === "object" &&
      !data.ready[event.player]
    ) {
      const { id, batch } = event.value as { id: number; batch: unknown };
      const art = data.art.find(
        (work) => work.id === id && work.artist === event.player,
      );
      if (!art) return { data };
      const accepted = Array.isArray(batch)
        ? batch
            .slice(0, Math.min(40, 480 - art.strokes.length))
            .filter(validStroke)
        : [];
      if (batch !== "clear" && !accepted.length) return { data };
      const strokes = batch === "clear" ? [] : [...art.strokes, ...accepted];
      return {
        data: {
          ...data,
          art: data.art.map((work) =>
            work.id === id ? { ...work, strokes } : work,
          ),
        },
        stroke: batch === "clear" ? "clear" : accepted,
      };
    }
  }
  if (data.stage === "WRITE") {
    if (expired || allOnlineActed(ctx, data.ready))
      return { data: deal(data, now), effect: "card" };
    if (
      event?.type === "slogans" &&
      Array.isArray(event.value) &&
      !data.ready[event.player]
    ) {
      const text = event.value
        .slice(0, 4)
        .filter(
          (value): value is string =>
            typeof value === "string" && Boolean(value.trim()),
        )
        .map((value) => value.trim().slice(0, 54));
      if (!text.length) return { data };
      const added = text.map((value, i) => ({
        id: data.slogans.length + i,
        writer: event.player,
        text: value,
      }));
      return {
        data: {
          ...data,
          slogans: [...data.slogans, ...added],
          ready: { ...data.ready, [event.player]: true },
        },
      };
    }
  }
  if (data.stage === "COMBINE") {
    if (expired || allOnlineActed(ctx, data.designs))
      return { data: startBracket(data, now), effect: "gavel" };
    if (
      event?.type === "design" &&
      typeof event.value === "object" &&
      event.value
    ) {
      const design = event.value as Design;
      const kit = data.kits[event.player];
      if (
        !kit.art.includes(design.art) ||
        !kit.slogans.includes(design.slogan) ||
        !Number.isInteger(design.shirt) ||
        !shirtColors[design.shirt]
      )
        return { data };
      return {
        data: { ...data, designs: { ...data.designs, [event.player]: design } },
      };
    }
  }
  if (data.stage === "BRACKET") {
    if (data.matchWinner)
      return expired
        ? { data: nextMatch(data, now), effect: "card" }
        : { data };
    if (expired || allOnlineActed(ctx, data.ballots)) {
      const votes = keyed(
        data.match,
        (id) =>
          Object.values(data.ballots).filter((vote) => vote === id).length,
      );
      const [a, b] = data.match;
      const result =
        votes[a] === votes[b]
          ? data.match[roll(2)]
          : votes[a] > votes[b]
            ? a
            : b;
      return {
        data: {
          ...data,
          matchWinner: result,
          eliminated: [...data.eliminated, result === a ? b : a],
          next: [...data.next, result],
          wins: { ...data.wins, [result]: data.wins[result] + 1 },
          votes,
          deadline: now + 4400,
        },
        effect: "coin",
      };
    }
    if (
      event?.type === "shirt-vote" &&
      typeof event.value === "string" &&
      data.match.includes(event.value)
    ) {
      return {
        data: {
          ...data,
          ballots: { ...data.ballots, [event.player]: event.value },
        },
      };
    }
  }
  if (data.stage === "RESULT" && expired && data.winner)
    return { data, rankings: [data.winner, ...[...data.eliminated].reverse()] };
  return { data };
}

function project(data: State, id: string): View {
  const {
    stage,
    deadline,
    bracketRound,
    match,
    votes,
    wins,
    winner,
    matchWinner,
  } = data;
  const kit = stage === "COMBINE" ? data.kits[id] : undefined;
  const shirts = Object.fromEntries(
    match.flatMap((player) => {
      const shirt = findShirt(data, player);
      return shirt
        ? [
            [
              player,
              stage === "BRACKET" || stage === "RESULT"
                ? {
                    ...shirt,
                    artwork: { ...shirt.artwork, artist: "", strokes: [] },
                    slogan: { ...shirt.slogan, writer: "" },
                  }
                : shirt,
            ],
          ]
        : [];
    }),
  );
  return {
    stage,
    deadline,
    bracketRound,
    match,
    votes,
    wins,
    winner,
    matchWinner,
    ownArt:
      stage === "DRAW" ? data.art.filter((work) => work.artist === id) : [],
    mySlogans: data.slogans.filter((slogan) => slogan.writer === id),
    art: kit ? data.art.filter((work) => kit.art.includes(work.id)) : [],
    slogans: kit
      ? data.slogans.filter((slogan) => kit.slogans.includes(slogan.id))
      : [],
    done: Boolean(data.ready[id]),
    ownDesign: data.designs[id],
    myVote: data.ballots[id],
    shirts,
  };
}

function Tee({ shirt }: { shirt: Shirt }) {
  return (
    <div
      className="tee-print"
      style={{ "--shirt": shirtColors[shirt.color] } as React.CSSProperties}
    >
      <svg viewBox="0 0 200 170" aria-hidden="true">
        <path
          d="M65 8 83 5q17 21 34 0l18 3 55 27-22 48-28-11v89H60V72L32 83 10 35Z"
          fill="var(--shirt)"
          stroke="#111113"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="m83 5 5 12a14 14 0 0 0 24 0l5-12M62 143h75M28 70l29-15m115 15-28-15"
          fill="none"
          stroke="#111113"
          strokeWidth="3"
        />
      </svg>
      <div className="tee-art">
        {shirt.artwork.strokes.length > 0 && (
          <TouchCanvas strokes={shirt.artwork.strokes} />
        )}
        <b>{shirt.slogan.text}</b>
      </div>
    </div>
  );
}

function TV({ data, room, now }: ScreenProps<State>) {
  const stageTitle = {
    DRAW: "Draw two mascots",
    WRITE: "Write four slogans",
    COMBINE: "Design a T-shirt",
    BRACKET: "Shirt tournament",
    RESULT: "Champion shirt",
  }[data.stage];
  return (
    <div className="game-columns">
      <section className="panel playing-stage">
        <div className="split">
          <span className="eyebrow">{stageTitle}</span>
          <Timer deadline={data.deadline} now={now} />
        </div>
        {!data.match.length && (
          <div className="stage-message">
            <Palette size={65} />
            <h2>{stageTitle}</h2>
            <p>
              {
                Object.keys(
                  data.stage === "COMBINE" ? data.designs : data.ready,
                ).length
              }{" "}
              of {data.ids.length} finished
            </p>
          </div>
        )}
        {data.match.length > 0 && (
          <div className="tee-grid">
            {data.match.map((id, i) => {
              const shirt = findShirt(data, id);
              return (
                shirt && (
                  <article key={id} className="panel tee-entry">
                    <h3>
                      {data.winner || data.matchWinner
                        ? nameOf(room, id)
                        : `Design ${i + 1}`}
                    </h3>
                    <Tee shirt={shirt} />
                    {data.matchWinner && (
                      <div className="pill">
                        {data.votes[id] ?? 0} votes{" "}
                        {data.matchWinner === id ? "· Winner" : ""}
                      </div>
                    )}
                  </article>
                )
              );
            })}
          </div>
        )}
      </section>
      <aside className="panel game-sidebar">
        <h3>Print shop</h3>
        {data.ids.map((id) => (
          <PlayerBadge
            key={id}
            player={findPlayer(room, id)}
            detail={`${data.wins[id]} match wins`}
            reaction={id === data.winner ? "winner" : "idle"}
          />
        ))}
      </aside>
    </div>
  );
}
function Phone({ data, room, me, now, send }: ScreenProps<View>) {
  const [pad, setPad] = useState(0);
  const [drafts, setDrafts] = useState(["", "", "", ""]);
  const [chosenArt, setArt] = useState<number>();
  const [chosenSlogan, setSlogan] = useState<number>();
  const [tint, setTint] = useState(0);
  const color = data.ownDesign?.shirt ?? tint;
  const current = data.ownArt[pad];
  const art =
    data.art.find((item) => item.id === (data.ownDesign?.art ?? chosenArt)) ??
    data.art[0];
  const slogan =
    data.slogans.find(
      (item) => item.id === (data.ownDesign?.slogan ?? chosenSlogan),
    ) ?? data.slogans[0];
  return (
    <div className="controller-stack">
      <div className="split">
        <span className="eyebrow">PRINT SHOP</span>
        <Timer deadline={data.deadline} now={now} />
      </div>
      {data.stage === "DRAW" &&
        (data.done ? (
          <p>Mascots submitted.</p>
        ) : (
          current && (
            <>
              <div className="actions">
                {data.ownArt.map((work, i) => (
                  <button
                    key={work.id}
                    className={pad === i ? "primary" : "secondary"}
                    onClick={() => setPad(i)}
                  >
                    Mascot {i + 1}
                  </button>
                ))}
              </div>
              <h2>{current.prompt}</h2>
              <TouchCanvas
                key={current.id}
                strokes={current.strokes}
                onDraw={(batch) =>
                  send("art-stroke", { id: current.id, batch })
                }
              />
              <button
                className="primary"
                onClick={() => send("finished-drawing")}
              >
                Submit both mascots
              </button>
            </>
          )
        ))}
      {data.stage === "WRITE" &&
        (data.done ? (
          <p>Slogans submitted.</p>
        ) : (
          <form
            className="controller-stack"
            onSubmit={(e) => {
              e.preventDefault();
              send("slogans", drafts);
            }}
          >
            <h2>Write four slogans.</h2>
            {drafts.map((value, i) => (
              <input
                key={i}
                maxLength={54}
                required
                value={value}
                placeholder={`Slogan ${i + 1}`}
                aria-label={`Slogan ${i + 1}`}
                onChange={(e) =>
                  setDrafts((old) =>
                    old.map((item, j) => (i === j ? e.target.value : item)),
                  )
                }
              />
            ))}
            <button className="primary" type="submit">
              Submit slogans
            </button>
          </form>
        ))}
      {data.stage === "COMBINE" && art && slogan && (
        <>
          <Tee shirt={{ artwork: art, slogan, color }} />
          {data.ownDesign ? (
            <div className="notice">
              Design submitted. Check the TV for the bracket.
            </div>
          ) : (
            <>
              <label htmlFor="mascot">Mascot</label>
              <select
                id="mascot"
                value={art.id}
                onChange={(e) => setArt(Number(e.target.value))}
              >
                {data.art.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.prompt}
                  </option>
                ))}
              </select>
              <label htmlFor="slogan">Slogan</label>
              <select
                id="slogan"
                value={slogan.id}
                onChange={(e) => setSlogan(Number(e.target.value))}
              >
                {data.slogans.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.text}
                  </option>
                ))}
              </select>
              <div className="avatar-swatches">
                {shirtColors.map((tone, i) => (
                  <button
                    className="swatch"
                    key={tone}
                    aria-pressed={tint === i}
                    aria-label={`Shirt color ${i + 1}`}
                    style={{ background: tone }}
                    onClick={() => setTint(i)}
                  />
                ))}
              </div>
              <button
                className="primary"
                onClick={() =>
                  send("design", {
                    art: art.id,
                    slogan: slogan.id,
                    shirt: tint,
                  })
                }
              >
                Enter the tournament
              </button>
            </>
          )}
        </>
      )}
      {data.stage === "BRACKET" && (
        <>
          <h2>Vote for a shirt.</h2>
          <p>See both designs on the TV.</p>
          {data.match.map((id, i) => (
            <button
              key={id}
              className="white-card"
              aria-pressed={data.myVote === id}
              disabled={Boolean(data.matchWinner)}
              onClick={() => send("shirt-vote", id)}
            >
              {data.matchWinner ? nameOf(room, id) : `Design ${i + 1}`} ·{" "}
              {data.shirts[id]?.slogan.text}
            </button>
          ))}
        </>
      )}
      {data.winner && (
        <div className="notice">
          <Trophy size={22} /> {nameOf(room, data.winner)} wins the bracket.
        </div>
      )}
    </div>
  );
}

export function canvasMashupGame(config: CanvasMashupConfig) {
  const { prompts, ...identity } = config;
  return defineGame<State, View>({
    ...identity,
    create: (ctx) => create(ctx, config),
    step,
    playerView: project,
    icon: Palette,
    TV,
    Phone,
  });
}
