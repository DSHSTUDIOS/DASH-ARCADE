import { defineGame, type ScreenProps } from "../types";
import { Timer } from "@/components/GameUI";
import { roll, shuffle, type TeamId, type TeamRosters } from "@/lib/types";
import { DefuseIcon } from "./icons";
import {
  TEAM_IDS,
  teamNames,
  teamOf,
  teamResult,
  teamResultLabel,
  teamRosters,
} from "./shared";

const symbols = ["arch", "burst", "orbit", "steps"] as const;
type SymbolName = (typeof symbols)[number];
type Kind = "wire" | "keypad" | "frequency";
type Module = {
  kind: Kind;
  badge: SymbolName;
  controls: SymbolName[];
  rules: Record<SymbolName, number[]>;
};
type Console = {
  modules: Module[];
  cleared: number;
  key: number;
  deadline: number;
  mistakes: number;
};
type Progress = Omit<Console, "modules">;
type State = {
  teams: TeamRosters;
  consoles: Record<TeamId, Console>;
  winner?: TeamId | "draw";
  resultAt?: number;
};
type View = {
  role: "Technician" | "Specialist";
  team: TeamId;
  consoles: Record<TeamId, Progress>;
  module?: Pick<Module, "kind"> & Partial<Omit<Module, "kind">>;
  winner?: TeamId | "draw";
};

const lengths: Record<Kind, number> = { wire: 1, keypad: 4, frequency: 1 };
const titles: Record<Kind, string> = {
  wire: "Ribbon wires",
  keypad: "Symbol keypad",
  frequency: "Frequency switch",
};
function makeModule(kind: Kind): Module {
  const controls = shuffle(symbols);
  const randomRule = () =>
    kind === "frequency"
      ? [roll(5)]
      : shuffle([0, 1, 2, 3]).slice(0, lengths[kind]);
  return {
    kind,
    badge: symbols[roll(symbols.length)],
    controls,
    rules: {
      arch: randomRule(),
      burst: randomRule(),
      orbit: randomRule(),
      steps: randomRule(),
    },
  };
}
function makeConsole(now: number): Console {
  return {
    modules: (["wire", "keypad", "frequency", "wire"] as const).map(makeModule),
    cleared: 0,
    key: 0,
    deadline: now + 90000,
    mistakes: 0,
  };
}

function Glyph({ symbol }: { symbol: SymbolName }) {
  const path = {
    arch: "M5 22V15a10 10 0 0 1 20 0v7M10 22h10",
    burst: "M15 3v24M3 15h24M6 6l18 18M24 6 6 24",
    orbit: "M25 15a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-19 8L24 7",
    steps: "M4 24h8v-8h8V8h6",
  }[symbol];
  return (
    <svg width="34" height="34" viewBox="0 0 30 30" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ConsoleArt({
  data,
  team,
  now,
}: {
  data: Progress;
  team: TeamId;
  now: number;
}) {
  return (
    <article className="team-box arcade-console" data-team={team}>
      <header>
        <h2>{teamNames[team]}</h2>
        <strong>{data.cleared} / 4 cleared</strong>
      </header>
      <div className="arcade-clock">
        <Timer now={now} deadline={data.deadline} duration={90} />
      </div>
      <ol className="arcade-leds" aria-label="Module progress">
        {Array.from({ length: 4 }, (_, i) => (
          <li
            key={i}
            data-cleared={data.cleared > i}
            aria-label={`Module ${i + 1} ${data.cleared > i ? "cleared" : "pending"}`}
          >
            {i + 1}
          </li>
        ))}
      </ol>
      <p>
        {data.cleared === 4
          ? "Console secured"
          : now >= data.deadline
            ? "Time expired"
            : `Module ${data.cleared + 1} · ${data.mistakes} penalties`}
      </p>
    </article>
  );
}
function TV({ data, now }: ScreenProps<State>) {
  const time = data.winner ? Math.min(now, (data.resultAt ?? now) - 5000) : now;
  return (
    <section className="team-game team-surface">
      <div className="team-callout">
        <strong>
          {data.winner
            ? teamResultLabel(data.winner)
            : "Defuse four modules before the clock runs out"}
        </strong>
      </div>
      <div className="team-pair">
        {TEAM_IDS.map((team) => (
          <ConsoleArt
            key={team}
            data={data.consoles[team]}
            team={team}
            now={time}
          />
        ))}
      </div>
    </section>
  );
}

function Manual({ module }: { module: NonNullable<View["module"]> }) {
  if (!module.rules || !module.controls) return null;
  return (
    <section className="team-stack defuse-manual">
      <h2>Specialist manual · {titles[module.kind]}</h2>
      <p>
        Ask your Technician for the panel badge. Find the matching row and read
        the solution aloud.
      </p>
      <div className="manual-rules">
        {symbols.map((symbol) => (
          <div key={symbol}>
            <b>
              <Glyph symbol={symbol} />
              {symbol}
            </b>
            <span>
              {module
                .rules![symbol].map((n) =>
                  module.kind === "frequency"
                    ? `Channel ${n + 1}`
                    : module.controls![n],
                )
                .join(" → ")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
function Controls({
  module,
  data,
  send,
}: {
  module: NonNullable<View["module"]>;
  data: Progress;
  send: ScreenProps<View>["send"];
}) {
  const controls = module.controls ?? [];
  return (
    <section className="team-stack defuse-controls">
      <h2>{titles[module.kind]}</h2>
      {module.badge && (
        <div className="team-callout">
          <b>Panel badge</b>
          <span>
            <Glyph symbol={module.badge} />
            {module.badge}
          </span>
        </div>
      )}
      <p>
        {module.kind === "keypad"
          ? `Press the four symbols in order · ${data.key} of 4 entered`
          : module.kind === "frequency"
            ? "Select the channel called out by your Specialist."
            : "Cut the make-believe ribbon called out by your Specialist."}
      </p>
      {module.kind === "wire" ? (
        <div className="arcade-wires">
          {controls.map((symbol, n) => (
            <button
              key={symbol}
              type="button"
              className="secondary"
              onClick={() =>
                send("module", { index: data.cleared, control: n })
              }
            >
              <svg viewBox="0 0 205 28" aria-hidden="true">
                <path
                  d="M6 14h36l15-6 35 12 33-10 28 8 14-4h32"
                  strokeWidth="12"
                  stroke="#111113"
                  fill="none"
                />
                <path
                  d="M6 14h36l15-6 35 12 33-10 28 8 14-4h32"
                  strokeWidth="7"
                  stroke={["#ff4f00", "#0047ff", "#a3df80", "#ffd24a"][n]}
                  fill="none"
                />
              </svg>
              <Glyph symbol={symbol} />
              {symbol}
            </button>
          ))}
        </div>
      ) : (
        <div className="arcade-keypad">
          {(module.kind === "frequency"
            ? [0, 1, 2, 3, 4]
            : controls.map((_, n) => n)
          ).map((n) => (
            <button
              className="secondary"
              key={n}
              onClick={() =>
                send("module", { index: data.cleared, control: n })
              }
            >
              {module.kind === "frequency" ? (
                `Channel ${n + 1}`
              ) : (
                <>
                  <Glyph symbol={controls[n]} />
                  {controls[n]}
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
function Phone({ data, now, send }: ScreenProps<View>) {
  const progress = data.consoles[data.team];
  const time = data.winner ? Math.min(now, progress.deadline) : now;
  return (
    <div className="team-stack">
      <header className="split">
        <strong>
          {data.role} · {teamNames[data.team]}
        </strong>
        <Timer deadline={progress.deadline} now={time} />
      </header>
      {data.winner ? (
        <p>{teamResultLabel(data.winner)}</p>
      ) : progress.deadline <= now ? (
        <p>Your timer expired. Watch the rival console on TV.</p>
      ) : !data.module ? (
        <p>Your console is secured.</p>
      ) : data.role === "Specialist" ? (
        <Manual module={data.module} />
      ) : (
        <Controls module={data.module} data={progress} send={send} />
      )}
      <small>
        {progress.cleared} / 4 modules · {progress.mistakes} penalties. A wrong
        input costs five seconds.
      </small>
    </div>
  );
}
export default defineGame<State, View>({
  id: "defuse-panic",
  team: true,
  title: "Defuse & Panic",
  category: "TEAM CO-OP RACE",
  description: "Race a cartoon console with a teammate reading the manual.",
  icon: DefuseIcon,
  accent: "#0047ff",
  create(context) {
    return {
      teams: teamRosters(context),
      consoles: {
        signal: makeConsole(context.now),
        cobalt: makeConsole(context.now),
      },
    };
  },
  step(s, { now }, event) {
    if (s.winner)
      return now >= (s.resultAt ?? 0)
        ? { data: s, teamWinner: s.winner }
        : { data: s };
    if (TEAM_IDS.every((team) => now >= s.consoles[team].deadline)) {
      const { signal, cobalt } = s.consoles;
      const winner = teamResult(
        { signal: signal.cleared, cobalt: cobalt.cleared },
        { signal: -signal.mistakes, cobalt: -cobalt.mistakes },
      );
      return { data: { ...s, winner, resultAt: now + 5000 }, effect: "gavel" };
    }
    if (
      !event ||
      event.type !== "module" ||
      !event.value ||
      typeof event.value !== "object"
    )
      return { data: s };
    const team = teamOf(s.teams, event.player);
    if (!team || s.teams[team][0] !== event.player) return { data: s };
    const console = s.consoles[team];
    const module = console.modules[console.cleared];
    const value = event.value as { index?: unknown; control?: unknown };
    const options = module?.kind === "frequency" ? 5 : 4;
    if (
      !module ||
      now >= console.deadline ||
      value.index !== console.cleared ||
      typeof value.control !== "number" ||
      !Number.isInteger(value.control) ||
      value.control < 0 ||
      value.control >= options
    )
      return { data: s };
    const correct = module.rules[module.badge][console.key] === value.control;
    const complete = correct && console.key + 1 === lengths[module.kind];
    const updated = {
      ...console,
      cleared: console.cleared + Number(complete),
      key: complete || !correct ? 0 : console.key + 1,
      deadline: correct
        ? console.deadline
        : Math.max(now, console.deadline - 5000),
      mistakes: console.mistakes + Number(!correct),
    };
    const next = { ...s, consoles: { ...s.consoles, [team]: updated } };
    if (updated.cleared === 4)
      return {
        data: { ...next, winner: team, resultAt: now + 5000 },
        effect: "victory",
      };
    return {
      data: next,
      effect: complete ? "coin" : correct ? "card" : "gavel",
    };
  },
  playerView(s, id) {
    const assigned = teamOf(s.teams, id);
    const team = assigned ?? "signal";
    const technician = s.teams[team][0] === id;
    const { modules: signal, ...signalProgress } = s.consoles.signal;
    const { modules: cobalt, ...cobaltProgress } = s.consoles.cobalt;
    const current = (team === "signal" ? signal : cobalt)[
      s.consoles[team].cleared
    ];
    const module =
      assigned && current
        ? technician
          ? {
              kind: current.kind,
              badge: current.badge,
              controls: current.controls,
            }
          : {
              kind: current.kind,
              controls: current.controls,
              rules: current.rules,
            }
        : undefined;
    return {
      team,
      role: technician ? "Technician" : "Specialist",
      consoles: { signal: signalProgress, cobalt: cobaltProgress },
      module,
      winner: s.winner,
    };
  },
  TV,
  Phone,
});
