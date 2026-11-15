import { useState } from "react";
import { Layers3, Vote, Zap } from "@/components/ArcadeIcons";
import { findPlayer, nameOf, PlayerBadge, Timer } from "@/components/GameUI";
import { keyed, orderBy, shuffle, type GameId } from "@/lib/types";
import {
  allOnlineActed,
  defineGame,
  type GameContext,
  type GameResult,
  type ScreenProps,
} from "@/games/types";

type Mode = "quip" | "fib" | "split";
type Prompt = { line: string; truth?: string; note?: string };
type Option = { id: string; text: string; owners: string[]; truth?: boolean };
type State = {
  mode: Mode;
  ids: string[];
  stage: "WRITE" | "VOTE" | "RESULT";
  round: number;
  deck: Prompt[];
  total: number;
  deadline: number;
  authors: string[];
  answers: Record<string, string>;
  ballots: Record<string, string>;
  entries: Option[];
  points: Record<string, number>;
  delta: Record<string, number>;
  bonus?: string;
};
type View = Pick<
  State,
  | "mode"
  | "stage"
  | "round"
  | "total"
  | "deadline"
  | "authors"
  | "points"
  | "delta"
  | "bonus"
> & {
  prompt: Prompt;
  answered: boolean;
  myVote?: string;
  votes: number;
  entries: (Omit<Option, "owners"> & {
    mine: boolean;
    owners?: string[];
    count?: number;
  })[];
};

const quips = [
  "The least helpful thing your phone could say as it reaches 1% battery.",
  "A terrible name for a chain of dentist offices.",
  "The one button that should never be added to an elevator.",
  "The real reason your cat wakes you up at 4 a.m.",
  "A message you don’t want embossed on a wedding cake.",
  "The title of a brutally honest cookbook.",
  "The one Yelp review a haunted house can’t recover from.",
  "A theme park ride that might void your insurance.",
  "A strange excuse to give when you’re caught in the fridge at midnight.",
  "An activity at a summer camp for retired supervillains.",
  "An award you would be embarrassed to win.",
  "A pet name that sounds terrible shouted across a park.",
  "The last feature you want in an AI-powered toaster.",
  "What the world’s laziest superhero puts on a business card.",
  "The worst possible name for a yoga pose.",
  "Something you should never bid on at an auction.",
].map((line) => ({ line }));
const fibs: Prompt[] = [
  {
    line: "A wombat’s droppings are shaped like ___.",
    truth: "cubes",
    note: "Variations in the wombat’s intestinal wall help form the corners.",
  },
  {
    line: "An octopus has ___ hearts.",
    truth: "three",
    note: "Two pump toward the gills, and one pumps to the rest of the body.",
  },
  {
    line: "The largest moon of Saturn is ___.",
    truth: "Titan",
    note: "Titan is bigger than the planet Mercury.",
  },
  {
    line: "The bone-like material in a shark’s skeleton is actually ___.",
    truth: "cartilage",
    note: "Cartilage is also found in human ears and noses.",
  },
  {
    line: "The only mammals capable of sustained powered flight are ___.",
    truth: "bats",
    note: "Flying squirrels glide instead.",
  },
  {
    line: "The tiny bones in a human middle ear include one called the ___.",
    truth: "stapes",
    note: "It’s also known as the stirrup for its shape.",
  },
  {
    line: "The Great Red Spot is a huge storm on ___.",
    truth: "Jupiter",
    note: "Its clouds rotate counterclockwise.",
  },
  {
    line: "The chemical symbol K stands for ___.",
    truth: "potassium",
    note: "The symbol comes from kalium.",
  },
  {
    line: "A flamingo gets its pink color from pigments in its ___.",
    truth: "food",
    note: "Carotenoids in the diet color the feathers.",
  },
  {
    line: "The largest species of penguin is the ___ penguin.",
    truth: "emperor",
  },
  {
    line: "Horseshoe crab blood gets its unusual color from a molecule containing ___.",
    truth: "copper",
    note: "Their oxygen-carrying molecule is hemocyanin.",
  },
  {
    line: "By surface area, the largest desert on Earth is ___.",
    truth: "Antarctica",
    note: "Deserts are defined by low precipitation, regardless of temperature.",
  },
];
const splits = [
  "A stranger gives you $10,000, but for the rest of your life, ___. Do you take it?",
  "You can teleport anywhere, but every trip ___. Do you use it?",
  "You never have to do chores again, but your roommate ___. Would you move in?",
  "You can relive any day, provided you also ___. Would you?",
  "You get a free vacation every year, but the hotel always ___. Do you book it?",
  "A machine makes your favorite meal for free, but it always ___. Do you bring it home?",
  "You can talk to animals, but whenever you do, ___. Would you try it?",
  "You inherit a mansion, but every Friday night ___. Do you move in?",
  "You can erase one embarrassing memory, but ___ replaces it. Do you press the button?",
  "Your phone has unlimited battery, but once a day it ___. Do you keep it?",
  "You receive lifetime front-row tickets, but before every show you must ___. Do you go?",
  "You can instantly master any instrument, but you must ___. Is it worth it?",
].map((line) => ({ line }));

const labels = {
  quip: {
    id: "quiplash-clash",
    title: "Quiplash Clash",
    category: "HEAD-TO-HEAD WIT",
    detail: "Write the punchline and win the room.",
    accent: "#ff5ca8",
  },
  fib: {
    id: "fibbage-lies",
    title: "Fibbage Lies",
    category: "TRIVIA & BLUFFING",
    detail: "Hide a convincing lie among the facts.",
    accent: "#00d68f",
  },
  split: {
    id: "split-the-room",
    title: "Split the Room",
    category: "DILEMMAS",
    detail: "Write a dilemma that divides the vote.",
    accent: "#ffb628",
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

const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "");
const current = (data: State) => data.deck[data.round % data.deck.length];
const writeTime = (mode: Mode) => (mode === "quip" ? 45000 : 35000);
function authorsFor(mode: Mode, ids: string[], round: number) {
  if (mode === "fib") return ids;
  if (mode === "split") return [ids[round % ids.length]];
  return [ids[round % ids.length], ids[(round + 1) % ids.length]];
}
function options(data: State): Option[] {
  if (data.mode === "split")
    return [
      { id: "yes", text: "Yes", owners: [] },
      { id: "no", text: "No", owners: [] },
    ];
  const entries = new Map<string, Omit<Option, "id">>();
  for (const [author, text] of Object.entries(data.answers)) {
    const key = data.mode === "quip" ? author : normalize(text);
    const existing = entries.get(key);
    if (existing) existing.owners.push(author);
    else entries.set(key, { text, owners: [author] });
  }
  const truth = current(data).truth;
  if (truth)
    entries.set(normalize(truth), { text: truth, owners: [], truth: true });
  return shuffle([...entries.values()]).map((entry, i) => ({
    ...entry,
    id: String(i),
  }));
}
function scored(data: State, now: number): State {
  const delta = keyed(data.ids, () => 0);
  let bonus: string | undefined;
  const ballots = Object.values(data.ballots);
  if (data.mode === "quip") {
    const eligibleVotes = ballots.length;
    for (const entry of data.entries) {
      const votes = ballots.filter((vote) => vote === entry.id).length;
      const owner = entry.owners[0];
      delta[owner] += 100 + votes * 100;
      if (
        data.entries.length === 2 &&
        eligibleVotes &&
        votes === eligibleVotes
      ) {
        delta[owner] += 500;
        bonus = owner;
      }
    }
  } else if (data.mode === "fib") {
    for (const [id, answer] of Object.entries(data.ballots)) {
      const selected = data.entries.find((entry) => entry.id === answer);
      if (selected?.truth) delta[id] += 500;
      else
        selected?.owners.forEach((owner) => {
          delta[owner] += 250;
        });
    }
  } else if (data.answers[data.authors[0]] && ballots.length) {
    const yes = ballots.filter((vote) => vote === "yes").length;
    delta[data.authors[0]] += Math.round(
      (1000 * Math.min(yes, ballots.length - yes)) / ballots.length,
    );
  }
  return {
    ...data,
    stage: "RESULT",
    deadline: now + 6500,
    delta,
    bonus,
    points: keyed(data.ids, (id) => data.points[id] + delta[id]),
  };
}

function step(
  data: State,
  ctx: GameContext,
  action?: { player: string; type: string; value?: unknown },
): GameResult<State> {
  const { now } = ctx;
  const expired = now >= data.deadline;
  if (data.stage === "WRITE") {
    if (
      expired ||
      allOnlineActed({ ...ctx, ids: data.authors }, data.answers)
    ) {
      const entries = options(data);
      const voting = {
        ...data,
        entries,
        stage: "VOTE" as const,
        deadline: now + 23000,
      };
      if (
        !data.ids.some((id) => ctx.online.includes(id)) ||
        entries.length < 2 ||
        (data.mode === "split" && !data.answers[data.authors[0]])
      )
        return { data: scored(voting, now), effect: "card" };
      return { data: voting, effect: "card" };
    }
    if (
      action?.type === "answer" &&
      data.authors.includes(action.player) &&
      !data.answers[action.player] &&
      typeof action.value === "string"
    ) {
      const text = action.value.trim().slice(0, 110);
      if (
        text &&
        (data.mode !== "fib" ||
          normalize(text) !== normalize(current(data).truth ?? ""))
      ) {
        return {
          data: {
            ...data,
            answers: { ...data.answers, [action.player]: text },
          },
        };
      }
    }
  }
  if (data.stage === "VOTE") {
    const voters = data.ids;
    if (expired || allOnlineActed({ ...ctx, ids: voters }, data.ballots))
      return { data: scored(data, now), effect: "coin" };
    if (
      action?.type === "ballot" &&
      voters.includes(action.player) &&
      typeof action.value === "string" &&
      data.entries.some(
        (entry) =>
          entry.id === action.value &&
          (data.mode !== "fib" || !entry.owners.includes(action.player)),
      )
    ) {
      return {
        data: {
          ...data,
          ballots: { ...data.ballots, [action.player]: action.value },
        },
      };
    }
  }
  if (data.stage === "RESULT" && expired) {
    const round = data.round + 1;
    if (round >= data.total)
      return { data, rankings: orderBy(data.ids, (id) => data.points[id]) };
    return {
      data: {
        ...data,
        round,
        authors: authorsFor(data.mode, data.ids, round),
        stage: "WRITE",
        deadline: now + writeTime(data.mode),
        answers: {},
        ballots: {},
        entries: [],
        bonus: undefined,
        delta: {},
      },
      effect: "card",
    };
  }
  return { data };
}

function project(data: State, id: string): View {
  const {
    mode,
    stage,
    round,
    total,
    deadline,
    authors,
    points,
    delta,
    bonus,
    answers,
  } = data;
  const reveal = stage === "RESULT";
  const prompt = current(data);
  const line =
    mode === "split" && stage !== "WRITE" && answers[authors[0]]
      ? prompt.line.replace("___", () => answers[authors[0]])
      : prompt.line;
  return {
    mode,
    stage,
    round,
    total,
    deadline,
    authors,
    points,
    delta,
    bonus,
    answered: Boolean(answers[id]),
    myVote: data.ballots[id],
    votes: Object.keys(data.ballots).length,
    prompt: {
      line,
      truth: reveal ? prompt.truth : undefined,
      note: reveal ? prompt.note : undefined,
    },
    entries: data.entries.map((entry) => ({
      id: entry.id,
      text: entry.text,
      mine: entry.owners.includes(id),
      owners: reveal ? entry.owners : undefined,
      truth: reveal ? entry.truth : undefined,
      count: reveal
        ? Object.values(data.ballots).filter((vote) => vote === entry.id).length
        : undefined,
    })),
  };
}

function TV({ data, room, now }: ScreenProps<State>) {
  const view = project(data, "");
  return (
    <div className="game-columns">
      <section className="panel playing-stage">
        <div className="split">
          <span className="eyebrow">
            ROUND {view.round + 1} / {view.total}
          </span>
          <Timer deadline={view.deadline} now={now} />
        </div>
        <div className="black-prompt">
          <Layers3 size={26} />
          <h2>{view.prompt.line}</h2>
        </div>
        {view.stage === "WRITE" && (
          <p>
            {view.authors.map((id) => nameOf(room, id)).join(" · ")} writing ·{" "}
            {Object.keys(data.answers).length} of {data.authors.length}{" "}
            submitted
          </p>
        )}
        {view.stage === "VOTE" && <p>{view.votes} votes in</p>}
        {view.bonus && (
          <div className="notice">
            QUIPLASH! {nameOf(room, view.bonus)} swept the vote. +500 bonus.
          </div>
        )}
        <div className="entry-grid">
          {view.entries.map((entry) => (
            <div key={entry.id} className="white-card" data-truth={entry.truth}>
              {entry.text}
              {view.stage === "RESULT" && (
                <small>
                  {entry.truth
                    ? "Truth · "
                    : entry.owners?.length
                      ? entry.owners.map((id) => nameOf(room, id)).join(", ") +
                        " · "
                      : ""}
                  {entry.count} vote{entry.count === 1 ? "" : "s"}
                </small>
              )}
            </div>
          ))}
        </div>
        {view.prompt.note && <p>{view.prompt.note}</p>}
      </section>
      <aside className="panel game-sidebar">
        <h3>Scoreboard</h3>
        {orderBy(data.ids, (id) => data.points[id]).map((id) => (
          <PlayerBadge
            key={id}
            player={findPlayer(room, id)}
            detail={`${view.points[id]} pts${view.delta[id] ? ` · +${view.delta[id]}` : ""}`}
            reaction={view.bonus === id ? "winner" : "idle"}
          />
        ))}
      </aside>
    </div>
  );
}
function Phone({ data: v, now, me, send }: ScreenProps<View>) {
  const [draft, setDraft] = useState("");
  const canWrite = v.authors.includes(me) && !v.answered;
  return (
    <div className="controller-stack">
      <div className="split">
        <span className="eyebrow">
          ROUND {v.round + 1} · {v.points[me]} POINTS
        </span>
        <Timer deadline={v.deadline} now={now} />
      </div>
      <h2>{v.prompt.line}</h2>
      {v.stage === "WRITE" &&
        (canWrite ? (
          <form
            className="controller-stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) {
                send("answer", draft);
                setDraft("");
              }
            }}
          >
            <label htmlFor="answer">
              {v.mode === "fib"
                ? "Write a believable lie"
                : v.mode === "split"
                  ? "Fill in the blank"
                  : "Write your punchline"}
            </label>
            <input
              id="answer"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={110}
              required
            />
            <button className="primary" type="submit">
              Submit answer
            </button>
          </form>
        ) : (
          <p>{v.answered ? "Answer received." : "The authors are writing."}</p>
        ))}
      {v.stage === "VOTE" && (
        <p>
          {v.mode === "fib"
            ? "Pick the real answer."
            : v.mode === "quip"
              ? "Vote for the funniest."
              : "Would you do it?"}
        </p>
      )}
      {v.entries.map((entry) => (
        <button
          key={entry.id}
          className="white-card"
          disabled={v.stage !== "VOTE" || (v.mode === "fib" && entry.mine)}
          aria-pressed={v.myVote === entry.id}
          onClick={() => send("ballot", entry.id)}
        >
          {entry.text}
          {entry.mine && <small>Your answer</small>}
          {entry.truth && <small>Truth</small>}
        </button>
      ))}
      {v.stage === "RESULT" && (
        <div className="notice">
          This round +{v.delta[me] ?? 0} points
          {v.bonus === me ? " · QUIPLASH!" : ""}
        </div>
      )}
    </div>
  );
}

export function promptVoteGame(mode: Mode) {
  const { id, title, category, detail, accent } = labels[mode];
  return defineGame<State, View>({
    id,
    title,
    category,
    description: detail,
    accent,
    icon: mode === "quip" ? Zap : mode === "fib" ? Layers3 : Vote,
    create: ({ ids, now }) => ({
      mode,
      ids,
      round: 0,
      total:
        mode === "fib"
          ? 6
          : mode === "quip"
            ? Math.max(3, ids.length)
            : ids.length,
      stage: "WRITE",
      deadline: now + writeTime(mode),
      deck: shuffle(mode === "quip" ? quips : mode === "fib" ? fibs : splits),
      authors: authorsFor(mode, ids, 0),
      answers: {},
      ballots: {},
      entries: [],
      points: keyed(ids, () => 0),
      delta: {},
    }),
    step,
    playerView: project,
    TV,
    Phone,
  });
}
