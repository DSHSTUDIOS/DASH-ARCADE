import { useState } from "react";
import { Brush, Send } from "@/components/ArcadeIcons";
import TouchCanvas from "@/components/TouchCanvas";
import { findPlayer, nameOf, PlayerBadge, Timer } from "@/components/GameUI";
import { keyed, orderBy, shuffle, validStroke, type Stroke } from "@/lib/types";
import {
  defineGame,
  type GameContext,
  type GameResult,
  type ScreenProps,
} from "./types";
import { guessSketchCategories } from "./prompts";

const prompts = Object.entries(guessSketchCategories).flatMap(
  ([category, words]) => words.map((word) => ({ word, category })),
);
const empty: Stroke[] = [];
type Sketch = {
  ids: string[];
  turn: number;
  prompts: typeof prompts;
  deadline: number;
  reveal: boolean;
  strokes: Stroke[];
  scores: Record<string, number>;
  correct: string[];
  guesses: Record<string, string>;
};
type View = Omit<Sketch, "prompts"> & {
  word?: string;
  mask: string;
  category: string;
  artist: string;
  viewer: string;
};

function create({ ids, now }: GameContext): Sketch {
  return {
    ids,
    turn: 0,
    prompts: shuffle(prompts),
    deadline: now + 60000,
    reveal: false,
    strokes: [],
    scores: keyed(ids, () => 0),
    correct: [],
    guesses: {},
  };
}
function step(
  data: Sketch,
  { now, online }: GameContext,
  event?: { player: string; type: string; value?: unknown },
): GameResult<Sketch> {
  const artist = data.ids[data.turn % data.ids.length];
  const eligible = data.ids.filter(
    (id) => id !== artist && online.includes(id),
  );
  if (data.reveal && now >= data.deadline) {
    if (data.turn + 1 === data.ids.length * 2)
      return { data, rankings: orderBy(data.ids, (id) => data.scores[id]) };
    return {
      data: {
        ...data,
        turn: data.turn + 1,
        strokes: [],
        correct: [],
        guesses: {},
        reveal: false,
        deadline: now + 60000,
      },
    };
  }
  if (data.reveal) return { data };
  if (
    now >= data.deadline ||
    !online.includes(artist) ||
    (eligible.length > 0 && eligible.every((id) => data.correct.includes(id)))
  ) {
    return {
      data: { ...data, reveal: true, deadline: now + 3800 },
      effect: "card",
    };
  }
  if (event?.player === artist && event.type === "stroke") {
    if (event.value === "clear")
      return { data: { ...data, strokes: [] }, stroke: "clear" };
    const remaining = 1200 - data.strokes.length;
    if (!Array.isArray(event.value) || !remaining) return { data };
    const batch = event.value
      .slice(0, Math.min(40, remaining))
      .filter(validStroke);
    return batch.length
      ? {
          data: { ...data, strokes: [...data.strokes, ...batch] },
          stroke: batch,
        }
      : { data };
  }
  if (
    event?.type === "guess" &&
    eligible.includes(event.player) &&
    !data.correct.includes(event.player) &&
    typeof event.value === "string"
  ) {
    const guess = event.value.trim().slice(0, 60);
    if (!guess) return { data };
    if (guess.toLowerCase() !== data.prompts[data.turn].word.toLowerCase()) {
      return {
        data: { ...data, guesses: { ...data.guesses, [event.player]: guess } },
      };
    }
    const rank = data.correct.length;
    return {
      data: {
        ...data,
        correct: [...data.correct, event.player],
        scores: {
          ...data.scores,
          [event.player]:
            data.scores[event.player] + Math.max(50, 300 - 75 * rank),
          [artist]: data.scores[artist] + Math.max(25, 200 - 50 * rank),
        },
      },
      effect: "coin",
    };
  }
  return { data };
}

function view(data: Sketch, id: string, tv = false): View {
  const { prompts: cards, ...state } = data;
  const artist = data.ids[data.turn % data.ids.length];
  const { word, category } = cards[data.turn];
  return {
    ...state,
    artist,
    viewer: id,
    strokes: tv || artist === id ? data.strokes : empty,
    guesses: tv ? {} : data.guesses[id] ? { [id]: data.guesses[id] } : {},
    word: (!tv && artist === id) || data.reveal ? word : undefined,
    mask: [...word]
      .map((char) =>
        /[a-z]/i.test(char) ? "_" : char === " " ? "\u00a0" : char,
      )
      .join(" "),
    category,
  };
}

function TV({ data, room, now }: ScreenProps<Sketch>) {
  const v = view(data, "", true);
  return (
    <div className="game-columns">
      <section className="panel sketch-stage">
        <div className="split">
          <PlayerBadge
            player={findPlayer(room, v.artist)}
            detail={`Artist · Turn ${v.turn + 1} / ${v.ids.length * 2}`}
          />
          <Timer deadline={v.deadline} now={now} duration={v.reveal ? 4 : 60} />
        </div>
        <h2 className="masked">{v.word ?? v.mask}</h2>
        <p className="center muted">{v.category}</p>
        <TouchCanvas strokes={v.strokes} />
      </section>
      <aside className="panel game-sidebar">
        <h3>Sketch scores</h3>
        {orderBy(v.ids, (id) => v.scores[id]).map((id) => (
          <PlayerBadge
            key={id}
            player={findPlayer(room, id)}
            detail={`${v.scores[id]} pts${v.correct.includes(id) ? " · Guessed it!" : ""}`}
            reaction={v.correct.includes(id) ? "happy" : "idle"}
          />
        ))}
      </aside>
    </div>
  );
}
function Phone({ data, room, me, now, send, canvas }: ScreenProps<View>) {
  const [guess, setGuess] = useState("");
  const isArtist = data.artist === me;
  return (
    <div className="controller-stack">
      <div className="split">
        <span className="eyebrow">{data.category}</span>
        <Timer deadline={data.deadline} now={now} />
      </div>
      {data.reveal ? (
        <>
          <h2>{data.word}</h2>
          <p>Your score is {data.scores[me]} points.</p>
        </>
      ) : isArtist ? (
        <>
          <h2>{data.word}</h2>
          <p>Draw the prompt. Keep the words off the canvas.</p>
          <TouchCanvas
            key={data.turn}
            strokes={data.strokes}
            onDraw={(batch) => send("stroke", batch)}
          />
        </>
      ) : (
        <>
          <h2>{data.mask}</h2>
          <p>{nameOf(room, data.artist)} is drawing on the TV.</p>
          {data.correct.includes(me) ? (
            <div className="notice">You got it! · {data.scores[me]} pts</div>
          ) : (
            <form
              className="controller-stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (guess.trim()) {
                  send("guess", guess);
                  setGuess("");
                }
              }}
            >
              <input
                aria-label="Your guess"
                placeholder="Type your guess"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                maxLength={60}
                autoComplete="off"
              />
              <button className="primary" type="submit">
                <Send size={16} /> Send guess
              </button>
              {data.guesses[me] && (
                <small>“{data.guesses[me]}” missed. Try again!</small>
              )}
            </form>
          )}
          {canvas?.key === `${room.epoch}:${data.turn}` && (
            <TouchCanvas strokes={canvas.strokes} />
          )}
        </>
      )}
    </div>
  );
}

export default defineGame<Sketch, View>({
  id: "guess-sketch",
  title: "GuessSketch",
  category: "DRAW & GUESS",
  accent: "#fa8cbf",
  icon: Brush,
  description: "Draw a simple word and race to guess the picture.",
  create,
  step,
  playerView: (data, id) => view(data, id),
  TV,
  Phone,
});
