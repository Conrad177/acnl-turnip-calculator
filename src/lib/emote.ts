import type { Hint } from "../engine/predict.ts";
import type { VisitAdvice } from "./extras.ts";

export const EMOTE_NAMES = [
  "waiting",
  "hopeful",
  "worried",
  "happy",
  "shocked",
  "sad",
  "smug",
  "thinking",
] as const;

export type EmoteName = (typeof EMOTE_NAMES)[number];

export function emoteForHint(hint: Hint): EmoteName {
  const title = hint.title.toLowerCase();
  if (title.includes("waiting for sunday")) return "waiting";
  if (title.includes("not joan's") || title.includes("cannot happen")) return "shocked";
  if (title.includes("cannot pay you back")) return "sad";
  if (title.includes("decreasing")) return "worried";
  if (title.includes("large spike is still ahead") || title.includes("still climbing")) {
    return "hopeful";
  }
  if (title.includes("spike is still possible")) return "thinking";
  if (
    title.includes("this is the large spike") ||
    title.includes("selling now") ||
    title.includes("locks the gain")
  ) {
    return "happy";
  }
  if (title.includes("noon check") || title.includes("filled in")) return "thinking";
  if (hint.tone === "bad") return "sad";
  if (hint.tone === "warn") return "worried";
  if (hint.tone === "good") return "happy";
  return "waiting";
}

export function emoteForVisit(advice: VisitAdvice): EmoteName {
  if (advice.title.startsWith("Visit ")) return "smug";
  if (advice.title === "Stay home") return "happy";
  if (advice.title.startsWith("Same price")) return "thinking";
  return "thinking";
}

export function emoteSrc(name: EmoteName): string {
  return `${import.meta.env.BASE_URL}emotes/${name}.png`;
}
