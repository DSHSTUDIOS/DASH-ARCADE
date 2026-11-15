import { useState } from "react";
import {
  ArrowDownToLine,
  RotateCcw,
  RotateCw,
  SwatchBook,
  Zap,
} from "@/components/ArcadeIcons";
import { findPlayer, nameOf, PlayerBadge, Timer } from "@/components/GameUI";
import { keyed, orderBy, shuffle } from "@/lib/types";
import {
  defineGame,
  type GameContext,
  type GameResult,
  type ScreenProps,
} from "./types";

const colors = ["Red", "Yellow", "Green", "Blue"] as const;
type Color = (typeof colors)[number];
type Card = { id: string; color?: Color; face: string };
const colorHex: Record<Color, string> = {
  Red: "#fa4b6c",
  Yellow: "#ffca34",
  Green: "#60d879",
  Blue: "#589bff",
};
type Clash = {
  ids: string[];
  deck: Card[];
  discard: Card[];
  hands: Record<string, Card[]>;
  turn: number;
  color: Color;
  direction: 1 | -1;
  deadline: number;
  note: string;
  uno?: { id: string; deadline: number };
  winner?: string;
};
type View = Omit<Clash, "deck" | "hands" | "discard"> & {
  counts: Record<string, number>;
  hand: Card[];
  top: Card;
};
const turnMs = 22000;
const values = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "Skip",
  "Reverse",
  "+2",
];

function create({ ids, now }: GameContext): Clash {
  const colored = colors.flatMap((color) =>
    [...values, ...values.slice(1)].map((face, index) => ({
      color,
      face,
      id: color + index,
    })),
  );
  const wilds = Array.from({ length: 8 }, (_, i) => ({
    face: i % 2 ? "Wild +4" : "Wild",
    id: "wild" + i,
  }));
  const deck = shuffle<Card>([...colored, ...wilds]);
  const start = deck.splice(
    deck.findIndex((card) => card.color && /^\d$/.test(card.face)),
    1,
  )[0];
  return {
    ids,
    deck,
    discard: [start],
    hands: keyed(ids, () => deck.splice(0, 7)),
    turn: 0,
    color: start.color!,
    direction: 1,
    deadline: now + turnMs,
    note: "Match the number or color on the discard.",
  };
}
function playable(card: Card, top: Card, color: Color) {
  return !card.color || card.color === color || card.face === top.face;
}

function draw(data: Clash, id: string, count: number): Clash {
  const deck = [...data.deck],
    discard = [...data.discard];
  const hand = [...data.hands[id]];
  for (let i = 0; i < count; i++) {
    if (!deck.length && discard.length > 1)
      deck.push(...shuffle(discard.splice(0, discard.length - 1)));
    const next = deck.pop();
    if (next) hand.push(next);
  }
  return { ...data, deck, discard, hands: { ...data.hands, [id]: hand } };
}

function step(
  data: Clash,
  { now, ids, online }: GameContext,
  event?: { player: string; type: string; value?: unknown },
): GameResult<Clash> {
  if (data.winner)
    return now < data.deadline
      ? { data }
      : {
          data,
          rankings: [
            data.winner,
            ...orderBy(
              ids.filter((id) => id !== data.winner),
              (id) => -data.hands[id].length,
            ),
          ],
        };
  const actor = ids[data.turn];
  const advance = (direction: number, spaces = 1) =>
    (((data.turn + direction * spaces) % ids.length) + ids.length) % ids.length;
  if (data.uno) {
    if (now >= data.uno.deadline)
      return {
        data: {
          ...draw(data, data.uno.id, 2),
          uno: undefined,
          deadline: now + turnMs,
          note: "Missed the UNO call. Draw two.",
        },
        effect: "gavel",
      };
    if (event?.type === "uno" && event.player === data.uno.id)
      return {
        data: {
          ...data,
          uno: undefined,
          deadline: now + turnMs,
          note: "UNO! One card left.",
        },
        effect: "coin",
      };
    if (event?.type === "call" && event.player !== data.uno.id)
      return {
        data: {
          ...draw(data, data.uno.id, 2),
          uno: undefined,
          deadline: now + turnMs,
          note: "Caught without calling UNO! Draw two.",
        },
        effect: "gavel",
      };
    return { data };
  }
  if (
    now >= data.deadline ||
    !online.includes(actor) ||
    (event?.player === actor && event.type === "draw")
  ) {
    const canPlay = data.hands[actor].some((card) =>
      playable(card, data.discard.at(-1)!, data.color),
    );
    if (now < data.deadline && online.includes(actor) && canPlay)
      return { data };
    return {
      data: {
        ...draw(data, actor, 1),
        turn: advance(data.direction),
        deadline: now + turnMs,
        note: "Drew a card and passed.",
      },
      effect: "card",
    };
  }
  if (
    event?.player !== actor ||
    event.type !== "play-card" ||
    !event.value ||
    typeof event.value !== "object"
  )
    return { data };
  const { cardId, color } = event.value as { cardId?: string; color?: Color };
  const card = data.hands[actor].find((entry) => entry.id === cardId);
  if (
    !card ||
    !playable(card, data.discard.at(-1)!, data.color) ||
    (!card.color && (!color || !colors.includes(color)))
  )
    return { data };
  const hand = data.hands[actor].filter((entry) => entry.id !== cardId);
  let next: Clash = {
    ...data,
    discard: [...data.discard, card],
    color: card.color ?? color!,
    deadline: now + turnMs,
    hands: { ...data.hands, [actor]: hand },
    note: `Played ${card.face}.`,
  };
  if (card.face === "Reverse") next.direction = data.direction === 1 ? -1 : 1;
  const penalty = card.face === "+2" ? 2 : card.face === "Wild +4" ? 4 : 0;
  const skip = Boolean(
    penalty ||
    card.face === "Skip" ||
    (card.face === "Reverse" && ids.length === 2),
  );
  if (penalty) next = draw(next, ids[advance(next.direction)], penalty);
  next.turn = advance(next.direction, skip ? 2 : 1);
  if (hand.length === 1) next.uno = { id: actor, deadline: now + 4000 };
  if (!hand.length)
    next = {
      ...next,
      winner: actor,
      deadline: now + 5000,
      note: "Last card played!",
    };
  return { data: next, effect: next.winner ? "victory" : "card" };
}

function playerView(data: Clash, id: string): View {
  const { deck, hands, discard, ...rest } = data;
  return {
    ...rest,
    counts: keyed(data.ids, (key) => hands[key].length),
    hand: hands[id] ?? [],
    top: discard.at(-1)!,
  };
}
function UnoCard({
  card,
  giant,
  disabled,
  onClick,
}: {
  card: Card;
  giant?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const contents = (
    <>
      <small>{card.face}</small>
      <b>{card.face}</b>
      <small>{card.face}</small>
    </>
  );
  const style = {
    "--card-color": card.color ? colorHex[card.color] : "#563791",
  } as React.CSSProperties;
  const label = `${card.color ?? ""} ${card.face}`.trim();
  return giant ? (
    <div className="uno-card uno-giant" data-wild={!card.color} style={style}>
      {contents}
    </div>
  ) : (
    <button
      className="uno-card"
      data-wild={!card.color}
      aria-label={label}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      {contents}
    </button>
  );
}
function TV({ data, room, now }: ScreenProps<Clash>) {
  const v = playerView(data, "");
  return (
    <div className="game-columns">
      <div className="panel uno-stage">
        <div className="split">
          <span className="direction">
            {v.direction === 1 ? <RotateCw /> : <RotateCcw />}
            {v.direction === 1 ? "Clockwise" : "Counter-clockwise"}
          </span>
          <Timer deadline={v.uno?.deadline ?? v.deadline} now={now} />
        </div>
        <UnoCard key={v.top.id} card={v.top} giant />
        <span className="color-label" style={{ background: colorHex[v.color] }}>
          {v.color}
        </span>
        <h2>
          {v.winner
            ? `${nameOf(room, v.winner)} wins!`
            : v.uno
              ? `${nameOf(room, v.uno.id)} has one card!`
              : `${nameOf(room, v.ids[v.turn])}’s turn`}
        </h2>
        <p>{v.note}</p>
      </div>
      <aside className="panel game-sidebar">
        <h3>At the table</h3>
        {v.ids.map((id) => (
          <div
            key={id}
            className={v.ids[v.turn] === id && !v.winner ? "active-player" : ""}
          >
            <PlayerBadge
              player={findPlayer(room, id)}
              detail={`${v.counts[id]} cards`}
              reaction={v.winner === id ? "winner" : "idle"}
            />
          </div>
        ))}
      </aside>
    </div>
  );
}

function Phone({ data, me, room, now, send }: ScreenProps<View>) {
  const [wild, setWild] = useState<string>();
  const active = data.ids[data.turn] === me && !data.uno && !data.winner;
  const hasPlayable = data.hand.some((card) =>
    playable(card, data.top, data.color),
  );
  return (
    <div className="controller-stack">
      <div className="split">
        <span className="eyebrow">{data.hand.length} CARDS IN HAND</span>
        <Timer deadline={data.uno?.deadline ?? data.deadline} now={now} />
      </div>
      <h2>
        {data.winner
          ? `${nameOf(room, data.winner)} wins!`
          : data.uno
            ? "UNO race!"
            : active
              ? "Your turn"
              : `${nameOf(room, data.ids[data.turn])}’s turn`}
      </h2>
      <p>
        On top{" "}
        <b className="color-label" style={{ background: colorHex[data.color] }}>
          {data.color} {data.top.face}
        </b>
      </p>
      {data.uno && (
        <button
          className="primary action-xl"
          onClick={() => send(data.uno?.id === me ? "uno" : "call")}
        >
          <Zap size={20} />
          {data.uno.id === me ? "SHOUT UNO!" : "CALL OUT!"}
        </button>
      )}
      <div className="uno-hand">
        {data.hand.map((card) => (
          <UnoCard
            key={card.id}
            card={card}
            disabled={!active || !playable(card, data.top, data.color)}
            onClick={() =>
              card.color
                ? send("play-card", { cardId: card.id })
                : setWild(card.id)
            }
          />
        ))}
      </div>
      {active && (
        <button
          className="secondary"
          disabled={hasPlayable}
          onClick={() => send("draw")}
        >
          <ArrowDownToLine size={16} /> Draw card
        </button>
      )}
      {wild && active && (
        <div className="dialog-backdrop" onClick={() => setWild(undefined)}>
          <div
            className="panel wild-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Pick a color"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Pick a color</h3>
            <div className="wild-colors">
              {colors.map((color) => (
                <button
                  key={color}
                  style={{ background: colorHex[color] }}
                  onClick={() => {
                    send("play-card", { cardId: wild, color });
                    setWild(undefined);
                  }}
                >
                  {color}
                </button>
              ))}
            </div>
            <button className="subtle" onClick={() => setWild(undefined)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default defineGame<Clash, View>({
  id: "color-clash",
  title: "Color Clash",
  category: "CARD SHOWDOWN",
  accent: "#ffb66c",
  icon: SwatchBook,
  description: "Match, reverse, and shout UNO before anyone catches you.",
  create,
  step,
  playerView,
  TV,
  Phone,
});
