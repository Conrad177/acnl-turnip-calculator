import { PATTERN_NAMES, type PreviousChoice } from "../engine/patterns.ts";
import { patternLabel } from "../lib/extras.ts";
import type { WeekRecord } from "../lib/storage.ts";
import { Button } from "./ui/button.tsx";

export function WeekHistory({
  history,
  previous,
  onUsePattern,
}: {
  history: WeekRecord[];
  previous: PreviousChoice;
  onUsePattern: (pattern: PreviousChoice) => void;
}) {
  if (history.length === 0) return null;
  return (
    <section className="rounded-[1.75rem] border-[5px] border-orange bg-cream p-4 shadow-[0_6px_0_0_var(--color-orange-deep)] sm:p-5">
      <h2 className="font-display text-2xl font-bold">Saved weeks</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">
        Last week's pattern stays filled in from this list so you do not have to remember it.
      </p>
      <ul className="mt-3 space-y-2">
        {history.map((week, index) => {
          const label = patternLabel(week.pattern);
          const joan = week.buy ? `Joan ${week.buy}` : "No Joan price";
          const active = index === 0 && week.pattern !== "unknown" && previous === week.pattern;
          return (
            <li
              key={`${week.buy}-${index}`}
              className="flex flex-col gap-2 rounded-2xl border-[3px] border-orange/70 bg-paper px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="min-w-0 text-sm font-semibold leading-snug text-ink">
                {joan}
                <span className="text-soil"> · </span>
                {label}
                {active ? <span className="text-leaf"> · in use</span> : null}
              </p>
              {week.pattern !== "unknown" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full min-h-11 sm:w-auto"
                  onClick={() => onUsePattern(week.pattern)}
                >
                  Use as last week
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {previous !== "unknown" && previous !== "first" ? (
        <p className="mt-3 text-sm font-semibold text-soil">
          Using {PATTERN_NAMES[previous]} as last week.
        </p>
      ) : null}
    </section>
  );
}
