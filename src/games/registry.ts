import type { GameId } from "@/lib/types";
import boardBlitz from "./board-blitz";
import guessSketch from "./guess-sketch";
import crazyCards from "./crazy-cards";
import colorClash from "./color-clash";
import bidBrush from "./bid-brush";

import { fakinIt, triviaDungeon } from "./deduction-games";
import { fibbageLies, quiplashClash, splitTheRoom } from "./prompt-games";
import teeKo from "./tee-ko";
import brainwaves from "./team/brainwaves";
import cipherGrid from "./team/cipher-grid";
import signalJam from "./team/signal-jam";
import defusePanic from "./team/defuse-panic";

export const games = [
  boardBlitz,
  guessSketch,
  crazyCards,
  colorClash,
  bidBrush,
  quiplashClash,
  fibbageLies,
  splitTheRoom,
  teeKo,
  fakinIt,
  triviaDungeon,
  brainwaves,
  cipherGrid,
  signalJam,
  defusePanic,
];
export const registry = Object.fromEntries(
  games.map((game) => [game.id, game]),
) as Record<GameId, (typeof games)[number]>;
