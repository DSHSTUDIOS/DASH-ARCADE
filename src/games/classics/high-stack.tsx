import { Dices } from "@/components/ArcadeIcons";
import { findPlayer, PlayerBadge, Timer } from "@/components/GameUI";
import { defineGame, type ScreenProps } from "../types";
import { keyed, orderBy, shuffle } from "@/lib/types";

type Stack = {
  cards: number[];
  status: "open" | "banked" | "bust";
  lastAction?: number;
};
type State = {
  ids: string[];
  deck: number[];
  stacks: Record<string, Stack>;
  score: Record<string, number>;
  round: number;
  deadline: number;
  stage: "DRAW" | "REVEAL";
};
type View = Omit<State, "deck">;
const rounds = 6;
const goal = 120;
function makeDeck() {
  // Enough cards for twelve seven-card hands without recycling discarded numbers.
  return shuffle(
    Array.from({ length: 12 }, (_, i) => i + 1).flatMap((n) =>
      Array<number>(n + 3).fill(n),
    ),
  );
}
function value(stack: Stack) {
  return stack.status === "bust"
    ? 0
    : stack.cards.reduce((sum, n) => sum + n, 0) +
        (stack.cards.length === 7 ? 15 : 0);
}
function newStacks(ids: string[]) {
  return keyed(ids, () => ({ cards: [], status: "open" as const }));
}
function StackCards({ stack }: { stack: Stack }) {
  return (
    <div className="stack-cards">
      {stack.cards.map((card, i) => (
        <b
          key={i}
          data-duplicate={
            stack.status === "bust" && i === stack.cards.length - 1
          }
        >
          {card}
        </b>
      ))}
    </div>
  );
}
const label = (stack: Stack) =>
  stack.status === "bust"
    ? "Bust"
    : stack.status === "banked"
      ? "Banked"
      : "In play";
function TV({ data, room, now }: ScreenProps<State>) {
  return (
    <section className="team-surface classic-surface">
      <header className="classic-caption">
        <div>
          <h2>
            Round {data.round + 1} / {rounds}
          </h2>
          <p>Seven different numbers earns a 15-point bonus.</p>
        </div>
        <Timer now={now} deadline={data.deadline} />
      </header>
      <div className="stack-table">
        {orderBy(data.ids, (id) => data.score[id]).map((id) => (
          <article
            className="classic-card"
            key={id}
            data-stack-status={data.stacks[id].status}
          >
            <PlayerBadge
              player={findPlayer(room, id)}
              size={28}
              detail={`${data.score[id]} total · ${label(data.stacks[id])}`}
            />
            <StackCards stack={data.stacks[id]} />
          </article>
        ))}
      </div>
    </section>
  );
}
function Phone({ data, me, now, send }: ScreenProps<View>) {
  const stack = data.stacks[me];
  return (
    <div className="team-stack">
      <header className="classic-caption">
        <strong>
          {data.score[me]} total · Round {data.round + 1} / {rounds}
        </strong>
        <Timer now={now} deadline={data.deadline} />
      </header>
      <StackCards stack={stack} />
      <h2>
        {label(stack)} · {value(stack)} points
      </h2>
      {data.stage === "DRAW" && stack.status === "open" ? (
        <div className="team-pair">
          <button className="primary" onClick={() => send("draw")}>
            Draw a card
          </button>
          <button className="secondary" onClick={() => send("bank")}>
            Bank points
          </button>
        </div>
      ) : (
        <p>
          {stack.status === "bust"
            ? "A repeated number wiped this round’s stack."
            : "Waiting for the next round."}
        </p>
      )}
      <small>
        Bank before you repeat a number. Seven unique cards banks automatically.
      </small>
    </div>
  );
}
export default defineGame<State, View>({
  id: "high-stack",
  title: "High Stack",
  category: "PUSH YOUR LUCK",
  description:
    "Draw to build points, or bank before a repeated number wipes your stack.",
  icon: Dices,
  accent: "#bda7f3",
  create({ ids, now }) {
    return {
      ids,
      deck: makeDeck(),
      stacks: newStacks(ids),
      score: keyed(ids, () => 0),
      round: 0,
      deadline: now + 30000,
      stage: "DRAW",
    };
  },
  step(data, { now, online }, event) {
    if (data.stage === "REVEAL") {
      if (now < data.deadline) return { data };
      if (
        data.round + 1 >= rounds ||
        Object.values(data.score).some((n) => n >= goal)
      )
        return { data, rankings: orderBy(data.ids, (id) => data.score[id]) };
      return {
        data: {
          ...data,
          stage: "DRAW",
          round: data.round + 1,
          deadline: now + 30000,
          deck: makeDeck(),
          stacks: newStacks(data.ids),
        },
      };
    }
    if (
      now >= data.deadline ||
      data.ids
        .filter((id) => online.includes(id))
        .every((id) => data.stacks[id].status !== "open")
    ) {
      const stacks = keyed(data.ids, (id) => {
        const stack = data.stacks[id];
        return stack.status === "open"
          ? { ...stack, status: "banked" as const }
          : stack;
      });
      return {
        data: {
          ...data,
          stacks,
          stage: "REVEAL",
          deadline: now + 5000,
          score: keyed(data.ids, (id) => data.score[id] + value(stacks[id])),
        },
        effect: "coin",
      };
    }
    if (!event || !data.ids.includes(event.player)) return { data };
    const stack = data.stacks[event.player];
    if (stack.status !== "open") return { data };
    if (event.type === "bank")
      return {
        data: {
          ...data,
          stacks: {
            ...data.stacks,
            [event.player]: { ...stack, status: "banked" },
          },
        },
        effect: "coin",
      };
    if (
      event.type !== "draw" ||
      now < (stack.lastAction ?? -1000) + 180 ||
      !data.deck.length
    )
      return { data };
    const card = data.deck[0],
      cards = [...stack.cards, card];
    const status = stack.cards.includes(card)
      ? "bust"
      : cards.length === 7
        ? "banked"
        : "open";
    return {
      data: {
        ...data,
        deck: data.deck.slice(1),
        stacks: {
          ...data.stacks,
          [event.player]: { cards, status, lastAction: now },
        },
      },
      effect: status === "bust" ? "gavel" : "card",
    };
  },
  playerView({ deck, ...data }) {
    return data;
  },
  TV,
  Phone,
});
