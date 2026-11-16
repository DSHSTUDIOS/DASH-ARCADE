import { useState } from "react";
import { Palette } from "@/components/ArcadeIcons";
import { findPlayer, nameOf, Timer } from "@/components/GameUI";
import JellyAvatar from "@/components/JellyAvatar";
import { defineGame, type ScreenProps } from "../types";
import { keyed, orderBy, roll } from "@/lib/types";

const cols = 9,
  rows = 6,
  cells = cols * rows;
type State = {
  ids: string[];
  round: number;
  rounds: number;
  stage: "CLUE" | "PICK" | "REVEAL";
  target: number;
  clue: string;
  deadline: number;
  picks: Record<string, number>;
  score: Record<string, number>;
  earned: Record<string, number>;
};
type View = Omit<State, "target"> & { target?: number; mine?: number };
const area = (cell: number) => [cell % cols, Math.floor(cell / cols)];
const coord = (cell: number) =>
  `${String.fromCharCode(65 + Math.floor(cell / cols))}${(cell % cols) + 1}`;
const distance = (a: number, b: number) =>
  Math.max(...area(a).map((n, i) => Math.abs(n - area(b)[i])));
function clueText(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim().replace(/\s+/g, " ");
  return text.length <= 36 && /^[\p{L}]+(?:[- ]+[\p{L}]+)?$/u.test(text)
    ? text
    : "";
}

function PaletteBoard({
  target,
  picks,
  room,
  onPick,
}: {
  target?: number;
  picks?: Record<string, number>;
  room: ScreenProps<View>["room"];
  onPick?: (i: number) => void;
}) {
  const pins = Object.entries(picks ?? {});
  return (
    <div className="echo-palette" aria-label="Color grid">
      {Array.from({ length: cells }, (_, i) => {
        const [x, y] = area(i),
          light = 89 - y * 11;
        const style = {
          background: `hsl(${x * 40 - 8} ${84 - y * 3}% ${light}%)`,
          color: light < 47 ? "#fff" : "#111113",
        };
        const result = pins.filter(([, position]) => position === i);
        const label = `${coord(i)}${i === target ? " · target" : ""}`;
        return onPick ? (
          <button
            key={i}
            type="button"
            aria-label={label}
            style={style}
            onClick={() => onPick(i)}
          >
            {coord(i)}
          </button>
        ) : (
          <div
            key={i}
            aria-label={label}
            style={style}
            data-target={i === target}
          >
            <span>{coord(i)}</span>
            {result.length > 0 && (
              <div className="echo-pins">
                {result.slice(0, 2).map(([id]) => {
                  const player = findPlayer(room, id);
                  return player ? (
                    <JellyAvatar key={id} {...player.avatar} size={22} />
                  ) : null;
                })}
                {result.length > 2 && <strong>+{result.length - 2}</strong>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function TV({ data, room, now }: ScreenProps<State>) {
  const reveal = data.stage === "REVEAL";
  return (
    <section className="team-surface classic-surface">
      <header className="classic-caption">
        <div>
          <h2>
            {data.clue ||
              `${nameOf(room, data.ids[data.round])} is finding a clue`}
          </h2>
          <p>
            {reveal
              ? `Target: ${coord(data.target)}`
              : `Round ${data.round + 1} / ${data.rounds}`}
          </p>
        </div>
        <Timer now={now} deadline={data.deadline} />
      </header>
      <PaletteBoard
        room={room}
        target={reveal ? data.target : undefined}
        picks={reveal ? data.picks : undefined}
      />
      {reveal && (
        <p className="classic-center">
          {Object.entries(data.earned)
            .filter(([, score]) => score > 0)
            .map(([id, score]) => `${nameOf(room, id)} +${score}`)
            .join(" · ") || "No matches this round."}
        </p>
      )}
    </section>
  );
}
function ClueForm({ send }: { send: ScreenProps<View>["send"] }) {
  const [clue, setClue] = useState("");
  return (
    <form
      className="team-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (clueText(clue)) send("clue", clue);
      }}
    >
      <label>
        One- or two-word clue
        <input
          maxLength={36}
          value={clue}
          onChange={(e) => setClue(e.target.value)}
        />
      </label>
      <button className="primary" disabled={!clueText(clue)}>
        Send clue
      </button>
    </form>
  );
}
function Phone({ data, room, me, now, send }: ScreenProps<View>) {
  const guide = me === data.ids[data.round],
    pick = data.stage === "PICK" && !guide && data.mine === undefined;
  return (
    <div className="team-stack">
      <header className="classic-caption">
        <strong>
          {data.score[me]} pts · Round {data.round + 1}/{data.rounds}
        </strong>
        <Timer now={now} deadline={data.deadline} />
      </header>
      <h2>
        {data.clue ||
          (guide ? "Describe your marked swatch" : "Waiting for a color clue")}
      </h2>
      {data.stage !== "CLUE" || guide ? (
        <PaletteBoard
          room={room}
          target={data.target}
          picks={data.picks}
          onPick={pick ? (i) => send("pick", i) : undefined}
        />
      ) : null}
      {guide && data.stage === "CLUE" && (
        <ClueForm key={data.round} send={send} />
      )}
      {data.stage === "PICK" && data.mine !== undefined && (
        <p>Locked in: {coord(data.mine)}</p>
      )}
      {data.stage === "REVEAL" && (
        <p>You earned +{data.earned[me] ?? 0} this round.</p>
      )}
      <small>
        Exact match earns 4. One square away earns 2. Two squares away earns 1.
      </small>
    </div>
  );
}
export default defineGame<State, View>({
  id: "color-echo",
  title: "Color Echo",
  category: "COLOR CLUES",
  description: "Describe a hidden swatch. Everyone else tries to pinpoint it.",
  icon: Palette,
  accent: "#89d8b5",
  create({ ids, now }) {
    return {
      ids,
      round: 0,
      rounds: Math.min(6, ids.length),
      stage: "CLUE",
      target: roll(cells),
      clue: "",
      deadline: now + 22000,
      picks: {},
      score: keyed(ids, () => 0),
      earned: {},
    };
  },
  step(data, { now, online }, event) {
    const guide = data.ids[data.round];
    if (data.stage === "CLUE") {
      const clue =
        event?.type === "clue" && event.player === guide
          ? clueText(event.value)
          : "";
      if (now >= data.deadline || clue)
        return {
          data: {
            ...data,
            stage: "PICK",
            deadline: now + 22000,
            clue: clue || "No clue sent",
          },
        };
    } else if (data.stage === "PICK") {
      const guessers = data.ids.filter(
        (id) => id !== guide && online.includes(id),
      );
      if (
        now >= data.deadline ||
        guessers.every((id) => Object.hasOwn(data.picks, id))
      ) {
        const earned = keyed(data.ids, (id) => {
          if (!Object.hasOwn(data.picks, id)) return 0;
          const gap = distance(data.picks[id], data.target);
          return [4, 2, 1][gap] ?? 0;
        });
        earned[guide] = Math.min(
          4,
          Object.values(earned).filter((n) => n >= 2).length,
        );
        return {
          data: {
            ...data,
            stage: "REVEAL",
            deadline: now + 6500,
            earned,
            score: keyed(data.ids, (id) => data.score[id] + earned[id]),
          },
          effect: "shutter",
        };
      }
      if (
        event?.type === "pick" &&
        guessers.includes(event.player) &&
        !Object.hasOwn(data.picks, event.player) &&
        typeof event.value === "number" &&
        Number.isInteger(event.value) &&
        event.value >= 0 &&
        event.value < cells
      )
        return {
          data: {
            ...data,
            picks: { ...data.picks, [event.player]: event.value },
          },
        };
    } else if (now >= data.deadline) {
      if (data.round + 1 >= data.rounds)
        return { data, rankings: orderBy(data.ids, (id) => data.score[id]) };
      const fresh = roll(cells - 1);
      return {
        data: {
          ...data,
          round: data.round + 1,
          stage: "CLUE",
          deadline: now + 22000,
          target: fresh >= data.target ? fresh + 1 : fresh,
          clue: "",
          picks: {},
          earned: {},
        },
      };
    }
    return { data };
  },
  playerView({ target, picks, ...data }, id) {
    const mine = picks[id];
    return {
      ...data,
      target:
        data.stage === "REVEAL" ||
        (data.stage === "CLUE" && id === data.ids[data.round])
          ? target
          : undefined,
      picks:
        data.stage === "REVEAL"
          ? picks
          : mine !== undefined
            ? { [id]: mine }
            : {},
      mine,
    };
  },
  TV,
  Phone,
});
