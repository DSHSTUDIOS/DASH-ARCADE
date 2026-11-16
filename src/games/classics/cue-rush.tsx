import { Radio, Zap, RotateCw, Layers3 } from "@/components/ArcadeIcons";
import { findPlayer, PlayerBadge, Timer } from "@/components/GameUI";
import { allOnlineActed, defineGame, type ScreenProps } from "../types";
import { keyed, orderBy, roll, shuffle } from "@/lib/types";

const buttons = [
  { id: "spark", label: "Spark", icon: Zap, color: "#ffda68" },
  { id: "spin", label: "Spin", icon: RotateCw, color: "#a7d4f4" },
  { id: "stack", label: "Stack", icon: Layers3, color: "#f4b3d2" },
  { id: "signal", label: "Signal", icon: Radio, color: "#a5e3b4" },
] as const;
const rounds = 8;
type Cue = (typeof buttons)[number]["id"];
type Hit = "correct" | "wrong" | "early";
type State = {
  ids: string[];
  queue: Cue[];
  round: number;
  stage: "WAIT" | "GO" | "RECAP";
  deadline: number;
  hits: Record<string, Hit>;
  score: Record<string, number>;
  order: string[];
};
type View = Omit<State, "queue"> & { cue?: Cue };
const ready = (now: number) => now + 1700 + roll(2100);
const cueAt = (data: State) =>
  data.stage === "WAIT" ? undefined : data.queue[data.round];

function CueCard({ cue }: { cue?: Cue }) {
  const control = buttons.find((b) => b.id === cue);
  return (
    <div
      className="cue-flash"
      data-cue={cue ?? "waiting"}
      style={{ backgroundColor: control?.color }}
    >
      {control ? (
        <>
          <control.icon size={72} />
          <h2>{control.label}</h2>
        </>
      ) : (
        <h2>Wait for it</h2>
      )}
    </div>
  );
}
function TV({ data, now, room }: ScreenProps<State>) {
  return (
    <section className="team-surface classic-surface">
      <header className="classic-caption">
        <strong>
          Cue {data.round + 1} / {rounds}
        </strong>
        {data.stage !== "WAIT" && <Timer now={now} deadline={data.deadline} />}
      </header>
      <CueCard
        key={`${data.round}${data.stage === "WAIT" ? "wait" : "cue"}`}
        cue={cueAt(data)}
      />
      <div className="cue-standings">
        {orderBy(data.ids, (id) => data.score[id]).map((id) => (
          <PlayerBadge
            key={id}
            size={26}
            player={findPlayer(room, id)}
            detail={`${data.score[id]} pts${data.hits[id] ? " · " + data.hits[id] : ""}`}
          />
        ))}
      </div>
    </section>
  );
}
function Phone({ data, now, me, send }: ScreenProps<View>) {
  const attempted = data.hits[me];
  return (
    <div className="team-stack">
      <header className="classic-caption">
        <strong>{data.score[me]} pts</strong>
        {data.stage !== "WAIT" && <Timer now={now} deadline={data.deadline} />}
      </header>
      <h2 role="status">
        {attempted
          ? { correct: "Correct!", wrong: "Wrong button", early: "Too early" }[
              attempted
            ]
          : data.cue
            ? `Tap ${buttons.find((b) => b.id === data.cue)?.label}`
            : "Wait for it"}
      </h2>
      <div className="team-pair cue-controls">
        {buttons.map(({ id, label, icon: Icon, color }) => (
          <button
            type="button"
            className="secondary"
            key={id}
            disabled={!!attempted || data.stage === "RECAP"}
            style={{ backgroundColor: color }}
            onClick={() => send("press", id)}
          >
            <Icon size={30} />
            {label}
          </button>
        ))}
      </div>
      <small>
        First correct tap earns 3, next earns 2, and other correct taps earn 1.
        You get one try per cue.
      </small>
    </div>
  );
}
export default defineGame<State, View>({
  id: "cue-rush",
  title: "Cue Rush",
  category: "REFLEX CHALLENGE",
  description: "Wait for the cue and hit the right control before the room.",
  icon: Zap,
  accent: "#f9d062",
  create({ ids, now }) {
    return {
      ids,
      queue: [...shuffle(buttons), ...shuffle(buttons)].map((b) => b.id),
      round: 0,
      stage: "WAIT",
      deadline: ready(now),
      hits: {},
      score: keyed(ids, () => 0),
      order: [],
    };
  },
  step(data, context, event) {
    const { now } = context;
    if (data.stage === "WAIT" && now >= data.deadline)
      return {
        data: { ...data, stage: "GO", deadline: now + 5000 },
        effect: "tick",
      };
    if (
      data.stage === "GO" &&
      (now >= data.deadline || allOnlineActed(context, data.hits))
    )
      return {
        data: { ...data, stage: "RECAP", deadline: now + 3800 },
        effect: "coin",
      };
    if (data.stage === "RECAP") {
      if (now < data.deadline) return { data };
      if (data.round + 1 === rounds)
        return { data, rankings: orderBy(data.ids, (id) => data.score[id]) };
      return {
        data: {
          ...data,
          stage: "WAIT",
          round: data.round + 1,
          deadline: ready(now),
          hits: {},
          order: [],
        },
      };
    }
    if (
      event?.type !== "press" ||
      !data.ids.includes(event.player) ||
      data.hits[event.player] ||
      !buttons.some((b) => b.id === event.value)
    )
      return { data };
    const hit: Hit =
      data.stage === "WAIT"
        ? "early"
        : event.value === data.queue[data.round]
          ? "correct"
          : "wrong";
    const player = event.player,
      points =
        hit === "correct"
          ? data.order.length === 0
            ? 3
            : data.order.length === 1
              ? 2
              : 1
          : 0;
    return {
      data: {
        ...data,
        hits: { ...data.hits, [player]: hit },
        order: points ? [...data.order, player] : data.order,
        score: { ...data.score, [player]: data.score[player] + points },
      },
    };
  },
  playerView(data) {
    const { queue, ...view } = data;
    return { ...view, cue: cueAt(data) };
  },
  TV,
  Phone,
});
