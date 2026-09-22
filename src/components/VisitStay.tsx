import type { VisitAdvice } from "../lib/extras.ts";
import { cn } from "../lib/utils.ts";

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
        "rounded-[1.75rem] border-[5px] px-4 py-4 shadow-[0_6px_0_0_#c47a28] sm:px-5",
        toneClass[advice.tone],
      )}
    >
      <p className="font-display text-xl font-bold">{advice.title}</p>
      <p className="mt-1 text-sm font-semibold leading-relaxed">{advice.detail}</p>
    </div>
  );
}
