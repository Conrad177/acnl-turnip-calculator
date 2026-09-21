import type { Hint } from "../engine/predict.ts";
import { cn } from "../lib/utils.ts";

const toneClass = {
  info: "bg-blush/70 text-ink ring-soil/20",
  good: "bg-leaf/15 text-leaf-deep ring-leaf/30",
  warn: "bg-amber-100 text-ink ring-amber-300",
  bad: "bg-red-50 text-loss ring-loss/30",
} as const;

export function Advice({ hint }: { hint: Hint }) {
  return (
    <div
      role={hint.tone === "bad" ? "alert" : "status"}
      aria-live="polite"
      className={cn("rounded-2xl px-4 py-3 ring-1", toneClass[hint.tone])}
    >
      <p className="font-display text-lg font-semibold">{hint.title}</p>
      <p className="mt-1 text-sm leading-relaxed">{hint.detail}</p>
    </div>
  );
}
