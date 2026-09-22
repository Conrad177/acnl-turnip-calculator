import { emoteForVisit } from "../lib/emote.ts";
import type { VisitAdvice } from "../lib/extras.ts";
import { cn } from "../lib/utils.ts";
import { StatusEmote } from "./StatusEmote.tsx";

const toneClass = {
  info: "border-orange bg-cream text-ink",
  good: "border-leaf bg-[#e8f8dc] text-leaf-deep",
  warn: "border-orange bg-[#fff3d0] text-ink",
} as const;

export function VisitStay({ advice }: { advice: VisitAdvice | null }) {
  if (!advice) return null;
  return (
    <div
      role="status"
      className={cn(
        "overflow-visible rounded-[1.75rem] border-[5px] px-4 py-5 shadow-[0_6px_0_0_#c47a28] sm:px-5",
        toneClass[advice.tone],
      )}
    >
      <div className="flex items-center gap-3 overflow-visible">
        <StatusEmote name={emoteForVisit(advice)} />
        <p className="min-w-0 flex-1 font-display text-xl font-bold leading-tight">{advice.title}</p>
      </div>
      <p className="mt-1 text-sm font-semibold leading-relaxed">{advice.detail}</p>
    </div>
  );
}
