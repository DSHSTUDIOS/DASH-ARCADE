import { Layers3, Vote } from "@/components/ArcadeIcons";
import { findPlayer, nameOf, PlayerBadge, Timer } from "@/components/GameUI";
import { keyed, orderBy, shuffle } from "@/lib/types";
import {
  allOnlineActed,
  defineGame,
  type GameContext,
  type GameResult,
  type ScreenProps,
} from "./types";
import {
  familyAnswers,
  familyPrompts,
  unhingedAnswers,
  unhingedPrompts,
} from "./cards";

type Entry = { key: string; owner: string; card: string };
type Cards = {
  ids: string[];
  spicy: boolean;
  round: number;
  stage: "PICK" | "VOTE" | "RESULT";
  prompt: string;
  prompts: string[];
  deck: string[];
  hands: Record<string, string[]>;
  picked: Record<string, string>;
  entries: Entry[];
  ballots: Record<string, string>;
  scores: Record<string, number>;
  totals: Record<string, number>;
  winner?: string;
  deadline: number;
};
type CardView = Omit<
  Cards,
  "prompts" | "deck" | "hands" | "picked" | "entries" | "ballots"
> & {
  hand: string[];
  played?: string;
  vote?: string;
  entries: (Omit<Entry, "owner"> & { mine: boolean; owner?: string })[];
};

function create({ ids, now }: GameContext, spicy: boolean): Cards {
  const prompts = shuffle(
    spicy ? [...familyPrompts, ...unhingedPrompts] : familyPrompts,
  );
  const deck = shuffle(
    spicy ? [...familyAnswers, ...unhingedAnswers] : familyAnswers,
  );
  return {
    ids,
    spicy,
    round: 1,
    stage: "PICK",
    prompt: prompts.shift()!,
    prompts,
    deck,
    hands: keyed(ids, () => deck.splice(0, 7)),
    picked: {},
    entries: [],
    ballots: {},
    scores: keyed(ids, () => 0),
    totals: {},
    deadline: now + 30000,
  };
}

function step(
  data: Cards,
  context: GameContext,
  event?: { player: string; type: string; value?: unknown },
): GameResult<Cards> {
  const { now, ids } = context;
  const expired = now >= data.deadline;
  if (data.stage === "PICK") {
    if (expired || allOnlineActed(context, data.picked)) {
      const entries = shuffle(Object.entries(data.picked)).map(
        ([owner, card], i) => ({ key: String(i), owner, card }),
      );
      return {
        data: { ...data, entries, stage: "VOTE", deadline: now + 22000 },
        effect: "card",
      };
    }
    if (
      event?.type === "pick" &&
      typeof event.value === "string" &&
      !data.picked[event.player] &&
      data.hands[event.player]?.includes(event.value)
    ) {
      const played = event.value;
      const deck = [...data.deck];
      if (!deck.length) {
        const used = new Set([
          ...Object.values(data.hands).flat(),
          ...Object.values(data.picked),
          played,
        ]);
        deck.push(
          ...shuffle(
            (data.spicy
              ? [...familyAnswers, ...unhingedAnswers]
              : familyAnswers
            ).filter((card) => !used.has(card)),
          ),
        );
      }
      const next = deck.shift()!;
      return {
        data: {
          ...data,
          deck,
          picked: { ...data.picked, [event.player]: played },
          hands: {
            ...data.hands,
            [event.player]: [
              ...data.hands[event.player].filter((card) => card !== played),
              next,
            ],
          },
        },
      };
    }
  }
  if (data.stage === "VOTE") {
    const voters = {
      ...context,
      ids: ids.filter((id) => data.entries.some((entry) => entry.owner !== id)),
    };
    if (
      expired ||
      allOnlineActed(voters, data.ballots) ||
      data.entries.length === 0
    ) {
      const totals = keyed(
        data.entries.map((entry) => entry.key),
        (key) =>
          Object.values(data.ballots).filter((vote) => vote === key).length,
      );
      // Reveal order is shuffled each round, so ties select uniformly among tied entries.
      const top = [...data.entries].sort(
        (a, b) => totals[b.key] - totals[a.key],
      )[0];
      const winner =
        top && (totals[top.key] > 0 || data.entries.length === 1)
          ? top.owner
          : undefined;
      const scores = { ...data.scores };
      data.entries.forEach((entry) => {
        scores[entry.owner] +=
          totals[entry.key] + Number(entry.owner === winner);
      });
      return {
        data: {
          ...data,
          scores,
          totals,
          winner,
          stage: "RESULT",
          deadline: now + 5000,
        },
        effect: "coin",
      };
    }
    if (
      event?.type === "card-vote" &&
      typeof event.value === "string" &&
      data.entries.some(
        (entry) => entry.key === event.value && entry.owner !== event.player,
      )
    ) {
      return {
        data: {
          ...data,
          ballots: { ...data.ballots, [event.player]: event.value },
        },
      };
    }
  }
  if (data.stage === "RESULT" && expired) {
    const rankings = orderBy(ids, (id) => data.scores[id]);
    if (data.scores[rankings[0]] >= 10) return { data, rankings };
    const prompts = data.prompts.length
      ? [...data.prompts]
      : shuffle(
          data.spicy ? [...familyPrompts, ...unhingedPrompts] : familyPrompts,
        );
    return {
      data: {
        ...data,
        round: data.round + 1,
        prompt: prompts.shift()!,
        prompts,
        stage: "PICK",
        deadline: now + 30000,
        picked: {},
        entries: [],
        ballots: {},
        totals: {},
        winner: undefined,
      },
      effect: "card",
    };
  }
  return { data };
}

function playerView(data: Cards, id: string): CardView {
  const { prompts, deck, hands, picked, entries, ballots, ...publicData } =
    data;
  return {
    ...publicData,
    hand: hands[id] ?? [],
    played: picked[id],
    vote: ballots[id],
    entries: entries.map(({ key, card, owner }) => ({
      key,
      card,
      mine: owner === id,
      owner: data.stage === "RESULT" ? owner : undefined,
    })),
  };
}

function Sentence({ prompt, card }: { prompt: string; card: string }) {
  const [before, after] = prompt.split("___");
  return (
    <>
      {before}
      <em>{card}</em>
      {after}
    </>
  );
}

function TV({ data, room, now }: ScreenProps<Cards>) {
  return (
    <div className="game-columns">
      <section className="panel playing-stage">
        <div className="split">
          <span className="eyebrow">
            {data.spicy ? "UNHINGED" : "FAMILY CHAOS (PG-13)"} · ROUND{" "}
            {data.round}
          </span>
          <Timer deadline={data.deadline} now={now} />
        </div>
        <div className="black-prompt">
          <Layers3 size={23} />
          <h2>{data.prompt}</h2>
        </div>
        {data.stage === "PICK" ? (
          <p>
            {Object.keys(data.picked).length} / {data.ids.length} cards
            submitted
          </p>
        ) : (
          <div className="entry-grid">
            {data.entries.map((entry) => (
              <article className="white-card" key={entry.key}>
                <b>
                  <Sentence prompt={data.prompt} card={entry.card} />
                </b>
                <small>
                  {data.stage === "RESULT"
                    ? `${nameOf(room, entry.owner)} · ${data.totals[entry.key]} votes${entry.owner === data.winner ? " · Winner +1" : ""}`
                    : `Entry ${Number(entry.key) + 1}`}
                </small>
              </article>
            ))}
          </div>
        )}
        {data.stage === "VOTE" && !data.entries.length && (
          <p>No submissions this round.</p>
        )}
      </section>
      <aside className="panel game-sidebar">
        <h3>First to 10 points</h3>
        {orderBy(data.ids, (id) => data.scores[id]).map((id) => (
          <PlayerBadge
            key={id}
            player={findPlayer(room, id)}
            detail={`${data.scores[id]} points`}
            reaction={data.winner === id ? "happy" : "idle"}
          />
        ))}
      </aside>
    </div>
  );
}

function Phone({ data, me, now, send, room }: ScreenProps<CardView>) {
  return (
    <div className="controller-stack">
      <div className="split">
        <span className="eyebrow">
          ROUND {data.round} · {data.scores[me]} PTS
        </span>
        <Timer deadline={data.deadline} now={now} />
      </div>
      <div className="black-prompt">
        <h2>{data.prompt}</h2>
      </div>
      {data.stage === "PICK" &&
        (data.played ? (
          <div className="notice">Submitted “{data.played}”</div>
        ) : (
          <>
            <p>Pick a card from your hand.</p>
            <div className="entry-grid">
              {data.hand.map((card) => (
                <button
                  className="white-card"
                  key={card}
                  onClick={() => send("pick", card)}
                >
                  {card}
                </button>
              ))}
            </div>
          </>
        ))}
      {data.stage !== "PICK" && (
        <>
          <p>
            {data.stage === "VOTE"
              ? "Vote for your favorite sentence."
              : data.winner
                ? `${nameOf(room, data.winner)} won the round!`
                : "Round over."}
          </p>
          {data.entries.map((entry) => (
            <button
              className="white-card"
              disabled={entry.mine || data.stage !== "VOTE"}
              aria-pressed={data.vote === entry.key}
              key={entry.key}
              onClick={() => send("card-vote", entry.key)}
            >
              <Sentence prompt={data.prompt} card={entry.card} />
              <small>
                {entry.mine ? (
                  "Your card"
                ) : entry.owner ? (
                  nameOf(room, entry.owner)
                ) : data.vote === entry.key ? (
                  "Your vote"
                ) : (
                  <Vote size={16} />
                )}
              </small>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

export default defineGame<Cards, CardView>({
  id: "crazy-cards",
  title: "Crazy Cards",
  category: "COMEDY CARDS",
  accent: "#bba1ff",
  icon: Layers3,
  description: "Play the funniest answer. Let the room decide.",
  create,
  step,
  playerView,
  TV,
  Phone,
});
