import type { Hint, RemainingBounds } from "../engine/predict.ts";
import { emoteForHint } from "../lib/emote.ts";
import { cn } from "../lib/utils.ts";
import { StatusEmote } from "./StatusEmote.tsx";

const toneClass = {
  info: "border-orange bg-cream text-ink",
  good: "border-leaf bg-[#e8f8dc] text-leaf-deep",
  warn: "border-orange bg-[#fff3d0] text-ink",
  bad: "border-loss bg-[#ffe8e4] text-loss",
} as const;

export function Advice({
  hint,
  remaining,
}: {
  hint: Hint;
  remaining: RemainingBounds | null;
}) {
  return (
    <div
      role={hint.tone === "bad" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "overflow-visible rounded-[1.75rem] border-[5px] px-4 py-4 shadow-[0_6px_0_0_#c47a28] sm:px-5",
        toneClass[hint.tone],
      )}
    >
      <div className="flex items-center gap-3 overflow-visible">
        <StatusEmote name={emoteForHint(hint)} />
        <p className="min-w-0 flex-1 font-display text-xl font-bold leading-tight">{hint.title}</p>
      </div>
      {hint.sellTime ? (
        <p className="mt-2 text-sm font-bold">Best guess sell time: {hint.sellTime}</p>
      ) : null}
      <p className="mt-1 text-sm leading-relaxed font-semibold">{hint.detail}</p>
      {remaining ? (
        <p className="mt-2 text-sm font-semibold tabular-nums">
          Remaining: guaranteed min {remaining.guaranteedMin} · possible max {remaining.possibleMax}
        </p>
      ) : null}
    </div>
  );
}
