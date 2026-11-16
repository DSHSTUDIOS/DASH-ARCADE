import { useRef, useState } from "react";
import { defineGame, type ScreenProps } from "../types";
import { roll, shuffle, type TeamId, type TeamRosters } from "@/lib/types";
import { BrainwavesIcon } from "./icons";
import { spectrums } from "./spectrums";
import {
  otherTeam,
  teamNames,
  teamOf,
  teamResult,
  teamResultLabel,
  teamRosters,
  TeamScoreboard,
  wordsIn,
} from "./shared";

type Stage = "CLUE" | "TUNE" | "STEAL" | "REVEAL" | "RESULT";
type Side = "left" | "right";
type Round = { spectrum: (typeof spectrums)[number]; target: number };
type Points = Record<TeamId, number>;
type State = {
  teams: TeamRosters;
  rounds: Round[];
  round: number;
  stage: Stage;
  deadline: number;
  dial: number;
  clue: string;
  steals: Record<string, Side>;
  scores: Points;
  earned: number;
  stealEarned: boolean;
  accuracy: Points;
};
type View = Omit<State, "rounds" | "steals"> & {
  spectrum: Round["spectrum"];
  target?: number;
  mySteal?: Side;
};

const activeTeam = (round: number): TeamId =>
  round % 2 === 0 ? "signal" : "cobalt";
const telepath = (s: Pick<State, "teams" | "round">) => {
  const roster = s.teams[activeTeam(s.round)];
  return roster[Math.floor(s.round / 2) % roster.length];
};
const revealed = (s: Pick<State, "stage">) =>
  s.stage === "REVEAL" || s.stage === "RESULT";
function clueText(value: unknown, spectrum: Round["spectrum"]) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  const tokens = wordsIn(text);
  const forbidden = new Set(spectrum.flatMap(wordsIn));
  return text.length <= 90 &&
    tokens.length &&
    !tokens.some((word) => forbidden.has(word))
    ? text
    : "";
}

function polar(value: number, radius: number) {
  const angle = (value * Math.PI) / 100;
  return `${210 - radius * Math.cos(angle)} ${205 - radius * Math.sin(angle)}`;
}
function band(lo: number, hi: number, color: string) {
  return (
    <path
      d={`M ${polar(lo, 182)} A 182 182 0 0 1 ${polar(hi, 182)} L ${polar(hi, 135)} A 135 135 0 0 0 ${polar(lo, 135)} Z`}
      fill={color}
      stroke="#111113"
      strokeWidth="3"
    />
  );
}

function Gauge({
  dial,
  target,
  open,
}: {
  dial: number;
  target?: number;
  open: boolean;
}) {
  return (
    <svg
      className="brainwaves-gauge"
      viewBox="0 0 420 247"
      role="img"
      aria-label={`Dial at ${dial} out of 100${open && target !== undefined ? `, target at ${target}` : ""}`}
    >
      <path d="M16 211a194 194 0 0 1 388 0Z" fill="#111113" />
      <path
        d="M16 205a194 194 0 0 1 388 0Z"
        fill="#f4f0ea"
        stroke="#111113"
        strokeWidth="5"
      />
      {target !== undefined && (
        <g>
          {band(target - 9, target + 9, "#ff4f00")}
          {band(target - 6, target + 6, "#ffd24a")}
          {band(target - 2, target + 2, "#a3df80")}
        </g>
      )}
      <path
        className="brainwaves-shutter"
        data-open={open}
        d="M29 204a181 181 0 0 1 362 0Z"
        fill="#bfc9ef"
        stroke="#111113"
        strokeWidth="4"
      />
      {Array.from({ length: 11 }, (_, i) => (
        <path
          key={i}
          d={`M ${polar(i * 10, 186)} L ${polar(i * 10, 172)}`}
          stroke="#111113"
          strokeWidth="3"
        />
      ))}
      <g
        className="brainwaves-needle"
        style={{ transform: `rotate(${dial * 1.8 - 90}deg)` }}
      >
        <path
          d="M201 205 210 55 219 205Z"
          fill="#0047ff"
          stroke="#111113"
          strokeWidth="4"
        />
      </g>
      <circle
        cx="210"
        cy="205"
        r="11"
        fill="#ff4f00"
        stroke="#111113"
        strokeWidth="4"
      />
      <text x="20" y="236">
        0
      </text>
      <text x="210" y="236" textAnchor="middle">
        50
      </text>
      <text x="400" y="236" textAnchor="end">
        100
      </text>
    </svg>
  );
}

function Board({ data, now }: ScreenProps<State>) {
  const current = data.rounds[data.round];
  const active = activeTeam(data.round);
  const heading =
    data.stage === "RESULT"
      ? teamResultLabel(teamResult(data.scores, data.accuracy))
      : `Round ${data.round + 1} / 6 · ${teamNames[active]}`;
  const instruction = {
    CLUE: "Waiting for the Telepath",
    TUNE: "Tune the dial",
    STEAL: "Other team, vote left or right",
    REVEAL: `Dial +${data.earned} · Steal +${Number(data.stealEarned)}`,
    RESULT: "Final score",
  }[data.stage];
  return (
    <section className="team-game team-surface">
      <TeamScoreboard scores={data.scores} deadline={data.deadline} now={now}>
        {heading}
      </TeamScoreboard>
      <div className="brainwaves-spectrum">
        <strong>{current.spectrum[0]}</strong>
        <Gauge
          dial={data.dial}
          target={revealed(data) ? current.target : undefined}
          open={revealed(data)}
        />
        <strong>{current.spectrum[1]}</strong>
      </div>
      <div className="team-callout">
        <strong>{instruction}</strong>
        {data.clue && <span>Clue: {data.clue}</span>}
      </div>
    </section>
  );
}

function DialController({
  dial,
  send,
}: {
  dial: number;
  send: ScreenProps<View>["send"];
}) {
  const [local, setLocal] = useState<number>();
  const last = useRef(0);
  const value = local ?? dial;
  return (
    <div className="team-stack">
      <label>
        Dial <output>{value}</output>
        <input
          aria-label="Dial"
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => {
            const next = Number(e.target.value);
            setLocal(next);
            if (Date.now() - last.current >= 100) {
              last.current = Date.now();
              send("dial", next);
            }
          }}
          onPointerUp={() => send("dial", value)}
          onBlur={() => {
            if (local !== undefined) send("dial", local);
            setLocal(undefined);
          }}
        />
      </label>
      <button className="primary" onClick={() => send("lock", value)}>
        Lock Dial
      </button>
    </div>
  );
}

function Phone({ data, now, me, send }: ScreenProps<View>) {
  const [clue, setClue] = useState("");
  const team = teamOf(data.teams, me);
  const active = activeTeam(data.round);
  const isTelepath = me === telepath(data);
  return (
    <div className="team-stack">
      <TeamScoreboard scores={data.scores} deadline={data.deadline} now={now}>
        Round {data.round + 1} / 6
      </TeamScoreboard>
      <div className="team-ends">
        <b>{data.spectrum[0]}</b>
        <b>{data.spectrum[1]}</b>
      </div>
      {data.clue && (
        <p className="team-callout">
          Clue: <strong>{data.clue}</strong>
        </p>
      )}
      {data.stage === "CLUE" &&
        (isTelepath ? (
          <>
            <Gauge dial={data.target ?? 50} target={data.target} open />
            <p>
              Telepath · Center {data.target}. Give one clue without using any
              words on the spectrum.
            </p>
            <form
              className="team-stack"
              onSubmit={(e) => {
                e.preventDefault();
                send("clue", clue);
              }}
            >
              <label>
                Your clue
                <input
                  maxLength={90}
                  value={clue}
                  onChange={(e) => setClue(e.target.value)}
                />
              </label>
              <button
                className="primary"
                disabled={!clueText(clue, data.spectrum)}
              >
                Send clue
              </button>
            </form>
          </>
        ) : (
          <p>Your Telepath is tuning in.</p>
        ))}
      {data.stage === "TUNE" &&
        (team === active && !isTelepath ? (
          <DialController key={data.round} dial={data.dial} send={send} />
        ) : (
          <p>Tuners are moving the dial.</p>
        ))}
      {data.stage === "STEAL" &&
        (team !== active ? (
          <div className="team-stack">
            <p>Which side of {data.dial} is the center on?</p>
            <div className="team-pair">
              {(["left", "right"] as const).map((side) => (
                <button
                  className="secondary"
                  key={side}
                  aria-pressed={data.mySteal === side}
                  onClick={() => send("steal", side)}
                >
                  {side.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p>Locked at {data.dial}. The other team is guessing.</p>
        ))}
      {revealed(data) && (
        <strong>
          {data.stage === "RESULT"
            ? teamResultLabel(teamResult(data.scores, data.accuracy))
            : `Target: ${data.target}. Dial +${data.earned}, steal +${Number(data.stealEarned)}.`}
        </strong>
      )}
    </div>
  );
}

export default defineGame<State, View>({
  id: "brainwaves",
  team: true,
  title: "Brainwaves",
  category: "TEAM MIND-MELD",
  description: "Give a clue, tune the dial, and find the hidden target.",
  icon: BrainwavesIcon,
  accent: "#ff4f00",
  create(context) {
    return {
      teams: teamRosters(context),
      rounds: shuffle(spectrums)
        .slice(0, 6)
        .map((spectrum) => ({ spectrum, target: 9 + roll(83) })),
      round: 0,
      stage: "CLUE",
      deadline: context.now + 35000,
      dial: 50,
      clue: "",
      steals: {},
      scores: { signal: 0, cobalt: 0 },
      earned: 0,
      stealEarned: false,
      accuracy: { signal: 0, cobalt: 0 },
    };
  },
  step(s, { now, online }, event) {
    const active = activeTeam(s.round);
    const rival = otherTeam(active);
    const acting = event && teamOf(s.teams, event.player);
    const expired = now >= s.deadline;
    const round = s.rounds[s.round];
    if (s.stage === "CLUE") {
      const clue =
        event?.player === telepath(s) && event.type === "clue"
          ? clueText(event.value, round.spectrum)
          : "";
      if (expired || clue)
        return {
          data: {
            ...s,
            clue: expired ? "No clue submitted" : clue,
            stage: "TUNE",
            deadline: now + 35000,
          },
        };
    } else if (s.stage === "TUNE") {
      const tuner = acting === active && event?.player !== telepath(s);
      const valid =
        tuner &&
        Number.isInteger(event?.value) &&
        Number(event!.value) >= 0 &&
        Number(event!.value) <= 100;
      if (expired || (valid && event?.type === "lock"))
        return {
          data: {
            ...s,
            dial: expired ? s.dial : Number(event!.value),
            stage: "STEAL",
            deadline: now + 15000,
          },
          effect: "card",
        };
      if (valid && event?.type === "dial" && s.dial !== event.value)
        return { data: { ...s, dial: Number(event.value) } };
    } else if (s.stage === "STEAL") {
      if (
        !expired &&
        acting === rival &&
        event?.type === "steal" &&
        (event.value === "left" || event.value === "right")
      )
        return {
          data: { ...s, steals: { ...s.steals, [event.player]: event.value } },
        };
      const eligible = s.teams[rival].filter((id) => online.includes(id));
      if (
        expired ||
        (eligible.length > 0 && eligible.every((id) => s.steals[id]))
      ) {
        const votes = Object.values(s.steals),
          left = votes.filter((v) => v === "left").length,
          right = votes.length - left;
        const distance = Math.abs(s.dial - round.target);
        const earned =
          distance <= 2 ? 4 : distance <= 6 ? 3 : distance <= 9 ? 2 : 0;
        const stealEarned =
          round.target < s.dial
            ? left > right
            : round.target > s.dial && right > left;
        return {
          data: {
            ...s,
            stage: "REVEAL",
            deadline: now + 4800,
            earned,
            stealEarned,
            scores: {
              ...s.scores,
              [active]: s.scores[active] + earned,
              [rival]: s.scores[rival] + Number(stealEarned),
            },
            accuracy: {
              ...s.accuracy,
              [active]: s.accuracy[active] - distance,
            },
          },
          effect: "shutter",
        };
      }
    } else if (s.stage === "REVEAL" && expired) {
      return {
        data:
          s.round === 5
            ? { ...s, stage: "RESULT", deadline: now + 4200 }
            : {
                ...s,
                round: s.round + 1,
                stage: "CLUE",
                deadline: now + 35000,
                dial: 50,
                clue: "",
                steals: {},
              },
      };
    } else if (s.stage === "RESULT" && expired)
      return { data: s, teamWinner: teamResult(s.scores, s.accuracy) };
    return { data: s };
  },
  playerView(s, id) {
    const { rounds, steals, ...view } = s;
    const { spectrum, target } = rounds[s.round];
    return {
      ...view,
      spectrum,
      target:
        revealed(s) || (s.stage === "CLUE" && id === telepath(s))
          ? target
          : undefined,
      mySteal: steals[id],
    };
  },
  TV: Board,
  Phone,
});
