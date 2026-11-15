import { useState } from "react";
import {
  BadgeDollarSign,
  Gavel,
  Palette,
  Sparkles,
} from "@/components/ArcadeIcons";
import {
  dollars,
  findPlayer,
  nameOf,
  PlayerBadge,
  Timer,
} from "@/components/GameUI";
import TouchCanvas from "@/components/TouchCanvas";
import {
  keyed,
  orderBy,
  roll,
  shuffle,
  validStroke,
  type Stroke,
} from "@/lib/types";
import {
  allOnlineActed,
  defineGame,
  type GameContext,
  type GameResult,
  type ScreenProps,
} from "./types";
import { sketchPrompts } from "./prompts";

type Work = {
  id: number;
  title: string;
  artist: string;
  strokes: Stroke[];
  value: number;
  paid?: number;
  buyer?: string;
  demand?: boolean;
};
type Account = { cash: number; loans: number };
type Auction = {
  ids: string[];
  stage: "DRAW" | "TIPS" | "AUCTION" | "SOLD" | "APPRAISAL";
  works: Work[];
  hints: Record<string, number[]>;
  accounts: Record<string, Account>;
  ready: Record<string, boolean>;
  lot: number;
  bid: number;
  bidder?: string;
  bidders: string[];
  deadline: number;
};
type PublicWork = Omit<Work, "value" | "strokes"> & {
  value?: number;
  strokes?: Stroke[];
};
type View = Omit<Auction, "hints" | "works"> & {
  works: PublicWork[];
  tips: { title: string; value: number }[];
  worth?: Record<string, number>;
};

function create({ ids, now }: GameContext): Auction {
  const prompts = shuffle(sketchPrompts);
  const works = ids.flatMap((artist, i) =>
    [0, 1].map((j) => {
      const id = i * 2 + j;
      return { id, artist, title: prompts[id], value: 0, strokes: [] };
    }),
  );
  return {
    ids,
    works,
    accounts: keyed(ids, () => ({ cash: 3000, loans: 0 })),
    hints: {},
    ready: {},
    lot: 0,
    bid: 0,
    bidders: [],
    stage: "DRAW",
    deadline: now + 45000,
  };
}

const appraisal = (work: Pick<Work, "value" | "demand">) =>
  Math.round(work.value * (work.demand ? 1.3 : 1));
function worth(data: Auction, id: string) {
  const account = data.accounts[id];
  return (
    account.cash -
    account.loans * 1500 +
    data.works
      .filter((work) => work.buyer === id)
      .reduce((sum, work) => sum + appraisal(work), 0)
  );
}

function step(
  data: Auction,
  context: GameContext,
  event?: { player: string; type: string; value?: unknown },
): GameResult<Auction> {
  const { now, ids } = context;
  const expired = now >= data.deadline;
  if (data.stage === "DRAW") {
    if (expired || allOnlineActed(context, data.ready)) {
      const works = shuffle(
        data.works.map((work) => ({ ...work, value: 500 + roll(15) * 250 })),
      );
      const hints = keyed(ids, (id) =>
        shuffle(works.filter((work) => work.artist !== id))
          .slice(0, 2)
          .map((work) => work.id),
      );
      return {
        data: { ...data, works, hints, stage: "TIPS", deadline: now + 12500 },
        effect: "card",
      };
    }
    if (event?.type === "finished-drawing" && !data.ready[event.player]) {
      return {
        data: { ...data, ready: { ...data.ready, [event.player]: true } },
      };
    }
    if (
      event?.type === "art-stroke" &&
      !data.ready[event.player] &&
      event.value &&
      typeof event.value === "object"
    ) {
      const { id, batch } = event.value as { id: number; batch: unknown };
      const work = data.works.find(
        (item) => item.id === id && item.artist === event.player,
      );
      if (!work) return { data };
      const added = Array.isArray(batch)
        ? batch
            .slice(0, Math.min(40, 900 - work.strokes.length))
            .filter(validStroke)
        : [];
      if (batch !== "clear" && !added.length) return { data };
      const strokes = batch === "clear" ? [] : [...work.strokes, ...added];
      return {
        data: {
          ...data,
          works: data.works.map((item) =>
            item.id === id ? { ...item, strokes } : item,
          ),
        },
        stroke: batch === "clear" ? "clear" : added,
      };
    }
  }
  if (data.stage === "TIPS" && expired) {
    return {
      data: { ...data, stage: "AUCTION", deadline: now + 7000 },
      effect: "gavel",
    };
  }
  if (data.stage === "AUCTION") {
    if (expired) {
      const work = {
        ...data.works[data.lot],
        buyer: data.bidder,
        paid: data.bid,
        demand: data.bidders.length >= 3,
      };
      const accounts = { ...data.accounts };
      if (data.bidder) {
        accounts[data.bidder] = {
          ...accounts[data.bidder],
          cash: accounts[data.bidder].cash - data.bid,
        };
        if (data.bidder !== work.artist) {
          accounts[work.artist] = {
            ...accounts[work.artist],
            cash: accounts[work.artist].cash + data.bid * 0.5,
          };
        }
      }
      const works = data.works.map((item, i) => (i === data.lot ? work : item));
      return {
        data: { ...data, accounts, works, stage: "SOLD", deadline: now + 3200 },
        effect: "gavel",
      };
    }
    if (
      event?.type === "bid" &&
      (event.value === 100 || event.value === 250) &&
      event.player !== data.bidder
    ) {
      const amount = data.bid + event.value;
      if (data.accounts[event.player].cash < amount) return { data };
      return {
        data: {
          ...data,
          bid: amount,
          bidder: event.player,
          bidders: [...new Set([...data.bidders, event.player])],
          deadline: now + 5000,
        },
        effect: "coin",
      };
    }
  }
  if (
    event?.type === "loan" &&
    ["TIPS", "AUCTION", "SOLD"].includes(data.stage)
  ) {
    const account = data.accounts[event.player];
    if (account.loans === 2) return { data };
    return {
      data: {
        ...data,
        accounts: {
          ...data.accounts,
          [event.player]: {
            cash: account.cash + 1000,
            loans: account.loans + 1,
          },
        },
      },
      effect: "coin",
    };
  }
  if (data.stage === "SOLD" && expired) {
    if (data.lot + 1 === data.works.length)
      return {
        data: { ...data, stage: "APPRAISAL", deadline: now + 18000 },
        effect: "victory",
      };
    return {
      data: {
        ...data,
        lot: data.lot + 1,
        stage: "AUCTION",
        bid: 0,
        bidder: undefined,
        bidders: [],
        deadline: now + 7000,
      },
    };
  }
  if (data.stage === "APPRAISAL" && expired)
    return { data, rankings: orderBy(ids, (id) => worth(data, id)) };
  return { data };
}

function playerView(data: Auction, id: string): View {
  const { works, hints, ...rest } = data;
  const drawn = data.stage === "DRAW";
  const revealed = data.stage === "APPRAISAL";
  // Keep array order and lot indices during bidding. Reveal each prompt when its lot opens.
  const visible = drawn ? works.filter((work) => work.artist === id) : works;
  return {
    ...rest,
    works: visible.map(({ value, strokes, ...work }, index) => ({
      ...work,
      title:
        drawn || revealed || (data.stage !== "TIPS" && index <= data.lot)
          ? work.title
          : "",
      value: revealed ? value : undefined,
      strokes: drawn ? strokes : undefined,
    })),
    tips: (hints[id] ?? []).flatMap((key) => {
      const work = works.find((item) => item.id === key);
      return work ? [{ title: work.title, value: work.value }] : [];
    }),
    worth: revealed ? keyed(data.ids, (key) => worth(data, key)) : undefined,
  };
}

function TV({ data, room, now }: ScreenProps<Auction>) {
  const work = data.works[data.lot];
  const left = (data.deadline - now) / 1000;
  return (
    <div className="game-columns">
      <section className="panel auction-stage">
        <div className="split">
          <span className="eyebrow">
            {data.stage === "DRAW"
              ? "STUDIO"
              : data.stage === "TIPS"
                ? "INSIDER TIPS"
                : data.stage === "APPRAISAL"
                  ? "APPRAISAL"
                  : `LOT ${data.lot + 1} / ${data.works.length}`}
          </span>
          <Timer deadline={data.deadline} now={now} />
        </div>
        {data.stage === "DRAW" && (
          <div className="stage-message">
            <Palette size={58} />
            <h2>Make two masterpieces</h2>
            <p>
              {Object.keys(data.ready).length} / {data.ids.length} artists
              finished
            </p>
          </div>
        )}
        {data.stage === "TIPS" && (
          <div className="stage-message">
            <Sparkles size={58} />
            <h2>Check your insider tips</h2>
            <p>The auction opens shortly. Each collector starts with $3,000.</p>
          </div>
        )}
        {(data.stage === "AUCTION" || data.stage === "SOLD") && (
          <>
            <div className="easel">
              <TouchCanvas strokes={work.strokes} />
            </div>
            <div className="split auction-lot">
              <div>
                <h2>{work.title}</h2>
                <p>Art by {nameOf(room, work.artist)}</p>
              </div>
              <div className="auction-price">
                <b>{dollars(data.bid)}</b>
                <small>
                  {data.bidder ? nameOf(room, data.bidder) : "No bids"}
                </small>
              </div>
            </div>
            <div className="split">
              <strong className="sale-call">
                {data.stage === "SOLD"
                  ? data.bidder
                    ? "SOLD!"
                    : "No sale"
                  : left <= 2
                    ? "Going twice…"
                    : left <= 4
                      ? "Going once…"
                      : "Bidding open"}
              </strong>
              {data.bidders.length >= 3 && (
                <span className="pill">High demand ×1.3</span>
              )}
            </div>
          </>
        )}
        {data.stage === "APPRAISAL" && (
          <div className="appraisal-grid">
            {data.works.map((item, i) => (
              <article
                className="appraisal-card"
                key={item.id}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <TouchCanvas strokes={item.strokes} />
                <strong>{item.title}</strong>
                <small>
                  {dollars(item.value)}
                  {item.demand ? " × 1.3" : ""} ·{" "}
                  {item.buyer ? nameOf(room, item.buyer) : "Unsold"}
                </small>
                <b>{dollars(appraisal(item))}</b>
              </article>
            ))}
          </div>
        )}
      </section>
      <aside className="panel game-sidebar">
        <h3>{data.stage === "APPRAISAL" ? "Net worth" : "Collectors"}</h3>
        {(data.stage === "APPRAISAL"
          ? orderBy(data.ids, (id) => worth(data, id))
          : data.ids
        ).map((id) => (
          <PlayerBadge
            key={id}
            player={findPlayer(room, id)}
            detail={
              data.stage === "APPRAISAL"
                ? `${dollars(worth(data, id))} · ${dollars(data.accounts[id].loans * 1500)} debt`
                : dollars(data.accounts[id].cash)
            }
            reaction={
              data.stage === "APPRAISAL" &&
              worth(data, id) ===
                Math.max(...data.ids.map((key) => worth(data, key)))
                ? "winner"
                : "idle"
            }
          />
        ))}
      </aside>
    </div>
  );
}

function Phone({ data, room, me, now, send }: ScreenProps<View>) {
  const [pad, setPad] = useState(0);
  const account = data.accounts[me];
  const work = data.works[data.stage === "DRAW" ? pad : data.lot];
  return (
    <div className="controller-stack">
      <div className="split">
        <span className="eyebrow">
          {data.stage === "DRAW" ? "STUDIO" : dollars(account.cash) + " CASH"}
        </span>
        <Timer deadline={data.deadline} now={now} />
      </div>
      {data.stage === "DRAW" &&
        (data.ready[me] ? (
          <>
            <h2>Paintings submitted</h2>
            <p>Check the TV while the other artists finish.</p>
          </>
        ) : (
          <>
            <div className="actions">
              {data.works.map((item, i) => (
                <button
                  className={pad === i ? "primary" : "secondary"}
                  key={item.id}
                  onClick={() => setPad(i)}
                >
                  Painting {i + 1}
                </button>
              ))}
            </div>
            <h2>{work.title}</h2>
            <TouchCanvas
              key={work.id}
              strokes={work.strokes ?? []}
              onDraw={(batch) => send("art-stroke", { id: work.id, batch })}
            />
            <button
              className="primary"
              onClick={() => send("finished-drawing")}
            >
              Submit both paintings
            </button>
          </>
        ))}
      {data.stage === "TIPS" && <h2>Insider tips</h2>}
      {(data.stage === "AUCTION" || data.stage === "SOLD") && (
        <>
          <h2>{work.title}</h2>
          <div className="notice">
            {dollars(data.bid)} ·{" "}
            {data.bidder === me
              ? "You lead"
              : data.bidder
                ? nameOf(room, data.bidder)
                : "No bids yet"}
            {data.stage === "SOLD"
              ? data.bidder
                ? " · SOLD!"
                : " · No sale"
              : ""}
          </div>
          {data.stage === "AUCTION" && (
            <div className="actions">
              {[100, 250].map((increment) => (
                <button
                  key={increment}
                  className="primary action-xl"
                  disabled={
                    data.bidder === me || account.cash < data.bid + increment
                  }
                  onClick={() => send("bid", increment)}
                >
                  +{dollars(increment)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {["TIPS", "AUCTION", "SOLD"].includes(data.stage) && (
        <>
          <div className="insider-tips">
            {data.tips.map((tip) => (
              <p key={tip.title}>
                Collectors will pay <b>{dollars(tip.value)}</b> for “{tip.title}
                ”.
              </p>
            ))}
          </div>
          <button
            className="secondary"
            disabled={account.loans >= 2}
            onClick={() => send("loan")}
          >
            <BadgeDollarSign size={18} /> Take $1,000 shark loan ·{" "}
            {2 - account.loans} left
          </button>
          <small>
            Each loan costs $1,500 at appraisal. Artists earn half the sale
            price when a rival buys their work.
          </small>
        </>
      )}
      {data.stage === "APPRAISAL" && data.worth && (
        <>
          <h2>Your net worth is {dollars(data.worth[me])}</h2>
          <p>{dollars(account.loans * 1500)} in loans deducted.</p>
          {data.works
            .filter((item) => item.buyer === me)
            .map((item) => (
              <div className="notice" key={item.id}>
                {item.title} ·{" "}
                {dollars(
                  appraisal({ value: item.value!, demand: item.demand }),
                )}
              </div>
            ))}
        </>
      )}
    </div>
  );
}

export default defineGame<Auction, View>({
  id: "bid-brush",
  title: "Bid & Brush",
  category: "ART AUCTION",
  accent: "#68e5da",
  icon: Gavel,
  description: "Paint strange art and outbid your friends at auction.",
  create,
  step,
  playerView,
  TV,
  Phone,
});
