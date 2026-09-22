import type { PatternChance } from "../engine/predict.ts";

export function PatternOdds({
  chances,
  ready,
}: {
  chances: PatternChance[];
  ready: boolean;
}) {
  const shown = ready ? displayPercents(chances.map((chance) => chance.probability)) : null;
  return (
    <ul className="space-y-3">
      {chances.map((chance, index) => {
        const percent = shown ? shown[index] : null;
        return (
          <li key={chance.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-bold">{chance.name}</span>
              <span className="font-bold tabular-nums text-soil">{percent ?? "—"}</span>
            </div>
            <div
              className="h-4 overflow-hidden rounded-full border-[3px] border-orange/80 bg-blush"
              role="meter"
              aria-label={`${chance.name} probability`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent ? Number(percent.replace("%", "")) : 0}
              aria-valuetext={percent ?? "Not calculated yet"}
            >
              <div
                className="h-full rounded-full bg-leaf"
                style={{ width: `${Math.max(0, Math.min(100, (chance.probability || 0) * 100))}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function displayPercents(probabilities: number[]): string[] {
  const tenths = probabilities.map((probability) => Math.round(probability * 1000));
  const drift = 1000 - tenths.reduce((sum, value) => sum + value, 0);
  let largest = 0;
  for (let index = 1; index < tenths.length; index++) {
    if (tenths[index] > tenths[largest]) largest = index;
  }
  tenths[largest] += drift;
  return tenths.map((value) => `${(value / 10).toFixed(1)}%`);
}
