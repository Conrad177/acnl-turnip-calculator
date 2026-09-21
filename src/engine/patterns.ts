export const PATTERN_IDS = ["fluctuating", "large", "decreasing", "small"] as const;

export type PatternId = (typeof PATTERN_IDS)[number];

export type PreviousChoice = PatternId | "unknown" | "first";

export const PATTERN_NAMES: Record<PatternId, string> = {
  fluctuating: "Fluctuating",
  large: "Large spike",
  decreasing: "Decreasing",
  small: "Small spike",
};

/**
 * Datamined chance table. Row is last week's pattern, columns are
 * fluctuating, large spike, decreasing, small spike.
 * Counts are out of 100, from the generator's randint(0, 99) gates.
 */
export const TRANSITION_COUNTS: readonly (readonly number[])[] = [
  [20, 30, 15, 35],
  [50, 5, 20, 25],
  [25, 45, 5, 25],
  [45, 25, 15, 15],
];

export function transitionRow(previous: PatternId): number[] {
  const index = PATTERN_IDS.indexOf(previous);
  return TRANSITION_COUNTS[index].map((count) => count / 100);
}

/** Long-run pattern mix when last week is unknown. */
export function steadyState(): number[] {
  let prob = [0.25, 0.25, 0.25, 0.25];
  for (let step = 0; step < 64; step++) {
    const next = [0, 0, 0, 0];
    for (let from = 0; from < 4; from++) {
      const row = TRANSITION_COUNTS[from];
      for (let to = 0; to < 4; to++) {
        next[to] += prob[from] * (row[to] / 100);
      }
    }
    prob = next;
  }
  const total = prob.reduce((sum, value) => sum + value, 0);
  return prob.map((value) => value / total);
}

export function priorFor(previous: PreviousChoice): number[] {
  if (previous === "first") return [0, 0, 0, 1];
  if (previous === "unknown") return steadyState();
  return transitionRow(previous);
}
