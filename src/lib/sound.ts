import type { Effect } from "./types";

type Note = [
  frequency: number,
  duration: number,
  offset?: number,
  endFrequency?: number,
];
const effects: Record<Effect, { wave: OscillatorType; notes: Note[] }> = {
  boot: {
    wave: "triangle",
    notes: [
      [220, 0.09],
      [440, 0.11, 0.12],
      [659, 0.17, 0.23],
      [880, 0.35, 0.38],
      [1320, 0.24, 0.43],
    ],
  },
  join: {
    wave: "sine",
    notes: [
      [523, 0.1],
      [784, 0.16, 0.07],
      [1047, 0.12, 0.14],
    ],
  },
  tick: { wave: "triangle", notes: [[860, 0.065]] },
  dice: {
    wave: "square",
    notes: [
      [75, 0.045],
      [115, 0.04, 0.06],
      [90, 0.05, 0.12],
      [220, 0.065, 0.21],
    ],
  },
  coin: {
    wave: "sine",
    notes: [
      [831, 0.09],
      [1245, 0.19, 0.08],
    ],
  },
  card: { wave: "triangle", notes: [[1000, 0.085, 0, 160]] },
  gavel: {
    wave: "triangle",
    notes: [
      [170, 0.16, 0, 53],
      [330, 0.045],
    ],
  },
  victory: {
    wave: "triangle",
    notes: [
      [523, 0.16],
      [659, 0.16, 0.12],
      [784, 0.2, 0.24],
      [1047, 0.48, 0.38],
      [784, 0.38, 0.38],
      [659, 0.38, 0.38],
    ],
  },
};
let context: AudioContext | undefined;
export async function enableSound() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") await context.resume();
  } catch {
    /* Audio may be unavailable on this device. */
  }
}

export function playEffect(effect: Effect) {
  if (!context || context.state !== "running") return;
  const audio = context;
  const start = audio.currentTime;
  const { wave, notes } = effects[effect];
  notes.forEach(([hz, duration, offset = 0, target]) => {
    const time = start + offset;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(hz, time);
    if (target)
      oscillator.frequency.exponentialRampToValueAtTime(
        target,
        time + duration,
      );
    envelope.gain.setValueAtTime(0.001, time);
    envelope.gain.exponentialRampToValueAtTime(
      wave === "square" ? 0.035 : 0.09,
      time + 0.006,
    );
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(envelope).connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + duration);
  });
}
