import { useState } from "react";
import { Brush } from "@/components/ArcadeIcons";
import { findPlayer, nameOf, PlayerBadge, Timer } from "@/components/GameUI";
import { defineGame, allOnlineActed, type ScreenProps } from "../types";
import { keyed, orderBy, shuffle } from "@/lib/types";

const prompts = [
  "Midnight ___",
  "___ cabinet",
  "Emergency ___",
  "___ parade",
  "Pocket ___",
  "___ party",
  "Space ___",
  "___ sandwich",
  "Golden ___",
  "___ machine",
  "Secret ___",
  "___ station",
  "Disco ___",
  "___ club",
  "Robot ___",
  "___ shoes",
  "Winter ___",
  "___ house",
  "Banana ___",
  "___ doctor",
  "Ghost ___",
  "___ garden",
  "Vacation ___",
  "___ tower",
  "Lucky ___",
  "___ robot",
  "Monster ___",
  "___ surprise",
  "Kitchen ___",
  "___ town",
  "Mystery ___",
  "___ train",
  "Tiny ___",
  "___ planet",
  "Moon ___",
  "___ suit",
  "Luxury ___",
  "___ dance",
  "Electric ___",
  "___ game",
  "Snack ___",
  "___ rescue",
];
type State = {
  ids: string[];
  prompts: string[];
  round: number;
  stage: "WRITE" | "REVEAL";
  deadline: number;
  answers: Record<string, string>;
  score: Record<string, number>;
  earned: Record<string, number>;
};
type View = Omit<State, "prompts"> & {
  prompt: string;
  submitted: number;
  mine?: string;
};
function normalize(value: unknown) {
  if (typeof value !== "string") return "";
  const word = value.trim();
  return word.length <= 32 &&
    /^[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*$/u.test(word)
    ? word
    : "";
}
function key(word: string) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/’/g, "'");
}
function groups(answers: Record<string, string>) {
  const grouped = new Map<string, string[]>();
  for (const [id, word] of Object.entries(answers)) {
    const term = key(word);
    grouped.set(term, [...(grouped.get(term) ?? []), id]);
  }
  return [...grouped.values()].sort((x, y) => y.length - x.length);
}
function TV({ data, room, now }: ScreenProps<State>) {
  return (
    <section className="team-surface classic-surface">
      <header className="classic-caption">
        <b>
          Round {data.round + 1} / {data.prompts.length}
        </b>
        <Timer now={now} deadline={data.deadline} />
      </header>
      <h2 className="classic-prompt">{data.prompts[data.round]}</h2>
      {data.stage === "WRITE" ? (
        <p className="classic-center">
          {Object.keys(data.answers).length} / {data.ids.length} submitted
        </p>
      ) : (
        <div className="word-matches">
          {groups(data.answers).map((group) => (
            <article className="classic-card" key={group[0]}>
              <strong>
                {data.answers[group[0]]}{" "}
                <small>+{data.earned[group[0]]} each</small>
              </strong>
              <div>
                {group.map((id) => (
                  <PlayerBadge
                    key={id}
                    player={findPlayer(room, id)}
                    size={28}
                    detail={`${data.score[id]} pts`}
                  />
                ))}
              </div>
            </article>
          ))}
          {!Object.keys(data.answers).length && <p>No answers this round.</p>}
        </div>
      )}
    </section>
  );
}
function Answer({ send }: { send: ScreenProps<View>["send"] }) {
  const [answer, setAnswer] = useState("");
  return (
    <form
      className="team-stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (normalize(answer)) send("answer", answer);
      }}
    >
      <label>
        Your word
        <input
          maxLength={32}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </label>
      <button className="primary" disabled={!normalize(answer)}>
        Submit word
      </button>
    </form>
  );
}
function Phone({ data, room, now, me, send }: ScreenProps<View>) {
  return (
    <div className="team-stack">
      <header className="classic-caption">
        <b>Round {data.round + 1} / 5</b>
        <Timer now={now} deadline={data.deadline} />
      </header>
      <h2>{data.prompt}</h2>
      {data.stage === "WRITE" ? (
        data.mine ? (
          <p>
            Locked in: <b>{data.mine}</b>
          </p>
        ) : (
          <Answer key={data.round} send={send} />
        )
      ) : (
        <>
          <p>
            {data.mine
              ? `Round points: +${data.earned[me] ?? 0}.`
              : "You skipped this one."}
          </p>
          {groups(data.answers).map((group) => (
            <p key={group[0]}>
              <b>{data.answers[group[0]]}</b> ·{" "}
              {group.map((id) => nameOf(room, id)).join(", ")}
            </p>
          ))}
        </>
      )}
      <small>Exactly one match earns 3. A larger group earns 1 each.</small>
    </div>
  );
}
export default defineGame<State, View>({
  id: "word-sync",
  title: "Word Sync",
  category: "FINISH THE PHRASE",
  description: "Complete a phrase and try to match exactly one other player.",
  icon: Brush,
  accent: "#f6ba52",
  create({ ids, now }) {
    return {
      ids,
      prompts: shuffle(prompts).slice(0, 5),
      round: 0,
      stage: "WRITE",
      deadline: now + 24000,
      answers: {},
      score: keyed(ids, () => 0),
      earned: {},
    };
  },
  step(data, context, event) {
    const { now } = context;
    if (data.stage === "WRITE") {
      if (now >= data.deadline || allOnlineActed(context, data.answers)) {
        const earned: Record<string, number> = {};
        for (const group of groups(data.answers))
          for (const id of group)
            earned[id] = group.length === 2 ? 3 : group.length > 2 ? 1 : 0;
        return {
          data: {
            ...data,
            stage: "REVEAL",
            deadline: now + 6000,
            earned,
            score: keyed(data.ids, (id) => data.score[id] + (earned[id] ?? 0)),
          },
          effect: "card",
        };
      }
      const answer = event?.type === "answer" ? normalize(event.value) : "";
      if (
        answer &&
        event &&
        data.ids.includes(event.player) &&
        !data.answers[event.player]
      )
        return {
          data: {
            ...data,
            answers: { ...data.answers, [event.player]: answer },
          },
        };
    } else if (now >= data.deadline) {
      if (data.round + 1 >= data.prompts.length)
        return { data, rankings: orderBy(data.ids, (id) => data.score[id]) };
      return {
        data: {
          ...data,
          stage: "WRITE",
          round: data.round + 1,
          deadline: now + 24000,
          answers: {},
          earned: {},
        },
      };
    }
    return { data };
  },
  playerView(data, id) {
    const { prompts, answers, ...rest } = data;
    return {
      ...rest,
      prompt: prompts[data.round],
      answers: data.stage === "REVEAL" ? answers : {},
      submitted: Object.keys(answers).length,
      mine: answers[id],
    };
  },
  TV,
  Phone,
});
