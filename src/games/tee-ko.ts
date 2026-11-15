import { canvasMashupGame } from "@/engines/CanvasMashupEngine";
import { sketchPrompts } from "./prompts";

export default canvasMashupGame({
  id: "tee-ko",
  title: "Tee K.O. Brawl",
  category: "DRAW & DESIGN",
  description: "Print a ridiculous shirt and send it into the bracket.",
  accent: "#87a8ff",
  prompts: sketchPrompts,
});
