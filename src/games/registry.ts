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

import dropZone from "./classics/drop-zone";
import fleetHunt from "./classics/fleet-hunt";
import wordSync from "./classics/word-sync";
import highStack from "./classics/high-stack";
import colorEcho from "./classics/color-echo";
import cueRush from "./classics/cue-rush";

export const legacyGames = [
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
export const classicGames = [
  dropZone,
  fleetHunt,
  wordSync,
  highStack,
  colorEcho,
  cueRush,
];
export const games = [...legacyGames, ...classicGames];

export const registry = Object.fromEntries(
  games.map((game) => [game.id, game]),
) as Record<GameId, (typeof games)[number]>;
