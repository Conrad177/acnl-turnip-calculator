import {
  PATTERN_IDS,
  PATTERN_NAMES,
  priorFor,
  type PatternId,
  type PreviousChoice,
} from "./patterns.ts";

const SCALE = 10000;
const CAP = 701;

export interface SlotRange {
  min: number;
  max: number;
  likelyMin: number;
  likelyMax: number;
}

export interface PatternChance {
  id: PatternId;
  name: string;
  probability: number;
}

export interface Hint {
  tone: "info" | "good" | "warn" | "bad";
  title: string;
  detail: string;
}

export interface Forecast {
  status: "empty" | "impossible" | "ok";
  chances: PatternChance[];
  /** Null where the player already typed a price. */
  slots: Array<SlotRange | null>;
  hint: Hint;
}

type Sell = number | null;

class RatePdf {
  start: number;
  prob: Float64Array;

  constructor(start: number, prob: Float64Array) {
    this.start = start;
    this.prob = prob;
  }

  static uniform(lo: number, hi: number): RatePdf {
    const a = Math.round(lo * SCALE);
    const b = Math.round(hi * SCALE);
    const n = Math.max(1, b - a);
    const prob = new Float64Array(n);
    prob.fill(1 / n);
    return new RatePdf(a, prob);
  }

  compact(): void {
    let first = 0;
    const prob = this.prob;
    while (first < prob.length && prob[first] === 0) first++;
    let last = prob.length - 1;
    while (last > first && prob[last] === 0) last--;
    if (last < first) {
      this.prob = new Float64Array(0);
      return;
    }
    if (first === 0 && last === prob.length - 1) return;
    this.start += first;
    this.prob = prob.slice(first, last + 1);
  }

  /** Subtract a uniform drop of [dropLo, dropHi). */
  decay(dropLo: number, dropHi: number): void {
    const subLo = Math.round(dropLo * SCALE);
    const subHi = Math.round(dropHi * SCALE);
    const width = Math.max(1, subHi - subLo);
    const old = this.prob;
    const newStart = this.start - subHi;
    const newLen = old.length + width;
    const diff = new Float64Array(newLen + 1);
    for (let i = 0; i < old.length; i++) {
      const mass = old[i];
      if (mass === 0) continue;
      const destLo = i + 1;
      const destHi = i + width;
      const share = mass / width;
      diff[destLo] += share;
      diff[destHi + 1] -= share;
    }
    const next = new Float64Array(newLen);
    let acc = 0;
    for (let i = 0; i < newLen; i++) {
      acc += diff[i];
      next[i] = acc > 0 ? acc : 0;
    }
    this.start = newStart;
    this.prob = next;
    this.compact();
  }

  pricePmf(base: number, out: Float64Array): void {
    out.fill(0);
    const prob = this.prob;
    for (let i = 0; i < prob.length; i++) {
      const mass = prob[i];
      if (mass === 0) continue;
      const lo = (this.start + i) / SCALE;
      fillPrices(lo, lo + 1 / SCALE, base, out, mass);
    }
  }

  /** Keep only rates that produce `price`. Returns P(price). */
  condition(price: number, base: number): number {
    const next = new Float64Array(this.prob.length);
    let kept = 0;
    for (let i = 0; i < this.prob.length; i++) {
      const mass = this.prob[i];
      if (mass === 0) continue;
      const lo = (this.start + i) / SCALE;
      const frac = priceFraction(lo, lo + 1 / SCALE, base, price);
      const weight = mass * frac;
      next[i] = weight;
      kept += weight;
    }
    if (kept <= 0) {
      this.prob = next;
      return 0;
    }
    for (let i = 0; i < next.length; i++) next[i] /= kept;
    this.prob = next;
    this.compact();
    return kept;
  }
}

function priceFraction(rateLo: number, rateHi: number, base: number, price: number): number {
  if (!(rateHi > rateLo) || price < 0 || price >= CAP) return 0;
  const xLo = rateLo * base;
  const xHi = rateHi * base;
  const a = Math.max(xLo, price - 0.99999);
  const b = Math.min(xHi, price + 0.00001);
  if (b <= a) return 0;
  return (b - a) / (xHi - xLo);
}

function fillPrices(
  rateLo: number,
  rateHi: number,
  base: number,
  out: Float64Array,
  weight: number,
): void {
  if (!(weight > 0) || !(rateHi > rateLo)) return;
  const xLo = rateLo * base;
  const xHi = rateHi * base;
  const span = xHi - xLo;
  let pStart = Math.floor(xLo + 0.99999) - 1;
  let pEnd = Math.floor(xHi - 1e-12 + 0.99999) + 1;
  if (pStart < 0) pStart = 0;
  if (pEnd >= CAP) pEnd = CAP - 1;
  for (let price = pStart; price <= pEnd; price++) {
    const a = Math.max(xLo, price - 0.99999);
    const b = Math.min(xHi, price + 0.00001);
    if (b > a) out[price] += (weight * (b - a)) / span;
  }
}

function freshPmfs(): Float64Array[] {
  return Array.from({ length: 12 }, () => new Float64Array(CAP));
}

function applyChain(
  pmfs: Float64Array[],
  base: number,
  sells: Sell[],
  slotStart: number,
  length: number,
  rateLo: number,
  rateHi: number,
  dropLo: number,
  dropHi: number,
): number {
  if (length <= 0) return 1;
  const pdf = RatePdf.uniform(rateLo, rateHi);
  let likelihood = 1;
  for (let step = 0; step < length; step++) {
    const slot = slotStart + step;
    const observed = sells[slot];
    if (observed == null) {
      pdf.pricePmf(base, pmfs[slot]);
    } else {
      const kept = pdf.condition(observed, base);
      if (kept <= 0) return 0;
      likelihood *= kept;
      pmfs[slot][observed] = 1;
    }
    if (step < length - 1) pdf.decay(dropLo, dropHi);
  }
  return likelihood;
}

function applyIndependent(
  pmfs: Float64Array[],
  base: number,
  sells: Sell[],
  slot: number,
  rateLo: number,
  rateHi: number,
): number {
  const observed = sells[slot];
  if (observed == null) {
    fillPrices(rateLo, rateHi, base, pmfs[slot], 1);
    return 1;
  }
  const chance = priceFraction(rateLo, rateHi, base, observed);
  if (chance <= 0) return 0;
  pmfs[slot][observed] = 1;
  return chance;
}

function applyCouple(
  pmfs: Float64Array[],
  base: number,
  sells: Sell[],
  slot: number,
): number {
  const step = 0.002;
  const bins: Array<{ lo: number; hi: number }> = [];
  for (let rate = 1.4; rate < 2 - 1e-9; rate += step) {
    bins.push({ lo: rate, hi: Math.min(2, rate + step) });
  }
  const weights = new Float64Array(bins.length);
  const obsLeft = sells[slot];
  const obsPeak = sells[slot + 1];
  const obsRight = sells[slot + 2];
  let likelihood = 0;
  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i];
    let weight = 1 / bins.length;
    if (obsPeak != null) weight *= priceFraction(bin.lo, bin.hi, base, obsPeak);
    if (weight <= 0) continue;
    if (obsLeft != null) weight *= priceFraction(1.4, bin.hi, base, obsLeft + 1);
    if (weight <= 0) continue;
    if (obsRight != null) weight *= priceFraction(1.4, bin.hi, base, obsRight + 1);
    weights[i] = weight;
    likelihood += weight;
  }
  if (likelihood <= 0) return 0;

  const left = pmfs[slot];
  const peak = pmfs[slot + 1];
  const right = pmfs[slot + 2];
  for (let i = 0; i < bins.length; i++) {
    const weight = weights[i];
    if (weight <= 0) continue;
    const share = weight / likelihood;
    const bin = bins[i];
    if (obsPeak == null) fillPrices(bin.lo, bin.hi, base, peak, share);
    if (obsLeft == null) fillPrices(1.4, bin.hi, base, left, share);
    if (obsRight == null) fillPrices(1.4, bin.hi, base, right, share);
  }
  if (obsLeft == null) shiftDown(left);
  else left[obsLeft] = 1;
  if (obsRight == null) shiftDown(right);
  else right[obsRight] = 1;
  if (obsPeak != null) peak[obsPeak] = 1;
  return likelihood;
}

function shiftDown(pmf: Float64Array): void {
  for (let price = 0; price < CAP - 1; price++) pmf[price] = pmf[price + 1];
  pmf[CAP - 1] = 0;
}

interface BranchResult {
  likelihood: number;
  pmfs: Float64Array[];
}

function dead(): BranchResult {
  return { likelihood: 0, pmfs: freshPmfs() };
}

function fluctuatingBranch(
  base: number,
  sells: Sell[],
  dec1: number,
  hi1: number,
  hi3: number,
): BranchResult {
  const pmfs = freshPmfs();
  const hi23 = 7 - hi1;
  const hi2 = hi23 - hi3;
  const dec2 = 5 - dec1;
  let cursor = 0;
  let likelihood = 1;
  for (let i = 0; i < hi1; i++) {
    likelihood *= applyIndependent(pmfs, base, sells, cursor, 0.9, 1.4);
    if (likelihood <= 0) return dead();
    cursor++;
  }
  likelihood *= applyChain(pmfs, base, sells, cursor, dec1, 0.6, 0.8, 0.04, 0.1);
  if (likelihood <= 0) return dead();
  cursor += dec1;
  for (let i = 0; i < hi2; i++) {
    likelihood *= applyIndependent(pmfs, base, sells, cursor, 0.9, 1.4);
    if (likelihood <= 0) return dead();
    cursor++;
  }
  likelihood *= applyChain(pmfs, base, sells, cursor, dec2, 0.6, 0.8, 0.04, 0.1);
  if (likelihood <= 0) return dead();
  cursor += dec2;
  for (let i = 0; i < hi3; i++) {
    likelihood *= applyIndependent(pmfs, base, sells, cursor, 0.9, 1.4);
    if (likelihood <= 0) return dead();
    cursor++;
  }
  return { likelihood, pmfs };
}

function largeBranch(base: number, sells: Sell[], peakStart: number): BranchResult {
  const pmfs = freshPmfs();
  const decLen = peakStart - 2;
  let likelihood = applyChain(pmfs, base, sells, 0, decLen, 0.85, 0.9, 0.03, 0.05);
  if (likelihood <= 0) return dead();
  const bands: Array<[number, number]> = [
    [0.9, 1.4],
    [1.4, 2],
    [2, 6],
    [1.4, 2],
    [0.9, 1.4],
  ];
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    likelihood *= applyIndependent(pmfs, base, sells, decLen + i, band[0], band[1]);
    if (likelihood <= 0) return dead();
  }
  for (let slot = decLen + 5; slot < 12; slot++) {
    likelihood *= applyIndependent(pmfs, base, sells, slot, 0.4, 0.9);
    if (likelihood <= 0) return dead();
  }
  return { likelihood, pmfs };
}

function smallBranch(base: number, sells: Sell[], peakStart: number): BranchResult {
  const pmfs = freshPmfs();
  const decLen = peakStart - 2;
  let likelihood = applyChain(pmfs, base, sells, 0, decLen, 0.4, 0.9, 0.03, 0.05);
  if (likelihood <= 0) return dead();
  likelihood *= applyIndependent(pmfs, base, sells, decLen, 0.9, 1.4);
  if (likelihood <= 0) return dead();
  likelihood *= applyIndependent(pmfs, base, sells, decLen + 1, 0.9, 1.4);
  if (likelihood <= 0) return dead();
  likelihood *= applyCouple(pmfs, base, sells, decLen + 2);
  if (likelihood <= 0) return dead();
  const after = decLen + 5;
  if (after < 12) {
    likelihood *= applyChain(pmfs, base, sells, after, 12 - after, 0.4, 0.9, 0.03, 0.05);
    if (likelihood <= 0) return dead();
  }
  return { likelihood, pmfs };
}

function decreasingBranch(base: number, sells: Sell[]): BranchResult {
  const pmfs = freshPmfs();
  const likelihood = applyChain(pmfs, base, sells, 0, 12, 0.85, 0.9, 0.03, 0.05);
  if (likelihood <= 0) return dead();
  return { likelihood, pmfs };
}

interface WeightedBranch {
  pattern: number;
  weight: number;
  pmfs: Float64Array[];
  /** Half-day index of the spike peak, when this branch has one. */
  peakSlot?: number;
}

function collectBranches(base: number, sells: Sell[], prior: number[]): WeightedBranch[] {
  const found: WeightedBranch[] = [];

  for (const dec1 of [2, 3]) {
    for (let hi1 = 0; hi1 <= 6; hi1++) {
      const hi23 = 7 - hi1;
      for (let hi3 = 0; hi3 < hi23; hi3++) {
        const branchProb = 0.5 * (1 / 7) * (1 / hi23);
        const result = fluctuatingBranch(base, sells, dec1, hi1, hi3);
        const weight = prior[0] * branchProb * result.likelihood;
        if (weight > 0) found.push({ pattern: 0, weight, pmfs: result.pmfs });
      }
    }
  }

  for (let peak = 3; peak <= 9; peak++) {
    const result = largeBranch(base, sells, peak);
    const weight = prior[1] * (1 / 7) * result.likelihood;
    if (weight > 0) found.push({ pattern: 1, weight, pmfs: result.pmfs, peakSlot: peak });
  }

  const decreasing = decreasingBranch(base, sells);
  const decreasingWeight = prior[2] * decreasing.likelihood;
  if (decreasingWeight > 0) {
    found.push({ pattern: 2, weight: decreasingWeight, pmfs: decreasing.pmfs });
  }

  for (let peak = 2; peak <= 9; peak++) {
    const result = smallBranch(base, sells, peak);
    const weight = prior[3] * (1 / 8) * result.likelihood;
    if (weight > 0) found.push({ pattern: 3, weight, pmfs: result.pmfs, peakSlot: peak + 1 });
  }

  return found;
}

function percentile(hist: Float64Array, total: number, p: number, cutoff: number): number {
  const target = total * p;
  let acc = 0;
  let last = 0;
  for (let price = 0; price < hist.length; price++) {
    const mass = hist[price];
    if (mass <= cutoff) continue;
    acc += mass;
    last = price;
    if (acc >= target) return price;
  }
  return last;
}

function rangeFromHist(hist: Float64Array): SlotRange | null {
  let total = 0;
  for (let price = 0; price < hist.length; price++) {
    if (hist[price] > 0) total += hist[price];
  }
  if (!(total > 0)) return null;
  // Branch weights are products of many exact-price chances, so the
  // absolute mass can be tiny. Keep a relative floor for numeric dust.
  const cutoff = total * 1e-8;
  let min = -1;
  let max = -1;
  let kept = 0;
  for (let price = 0; price < hist.length; price++) {
    if (hist[price] > cutoff) {
      if (min < 0) min = price;
      max = price;
      kept += hist[price];
    }
  }
  if (min < 0 || kept <= 0) return null;
  const likelyMin = Math.max(min, percentile(hist, kept, 0.1, cutoff));
  const likelyMax = Math.min(max, Math.max(likelyMin, percentile(hist, kept, 0.9, cutoff)));
  return { min, max, likelyMin, likelyMax };
}

function emptyChances(): PatternChance[] {
  return PATTERN_IDS.map((id) => ({ id, name: PATTERN_NAMES[id], probability: 0 }));
}

function chancesFromMass(mass: number[]): PatternChance[] {
  const total = mass.reduce((sum, value) => sum + value, 0);
  return PATTERN_IDS.map((id, index) => ({
    id,
    name: PATTERN_NAMES[id],
    probability: total > 0 ? mass[index] / total : 0,
  }));
}

export function forecastWeek(
  buy: number | null,
  sells: Sell[],
  previous: PreviousChoice,
): Forecast {
  if (buy == null || Number.isNaN(buy)) {
    return {
      status: "empty",
      chances: emptyChances(),
      slots: Array.from({ length: 12 }, () => null),
      hint: {
        tone: "info",
        title: "Waiting for Sunday's price",
        detail:
          "Enter the price Joan charged on Sunday morning. That number is the base for every Re-Tail price this week.",
      },
    };
  }

  if (!Number.isInteger(buy) || buy < 90 || buy > 110) {
    return {
      status: "impossible",
      chances: emptyChances(),
      slots: Array.from({ length: 12 }, () => null),
      hint: {
        tone: "bad",
        title: "That is not Joan's price",
        detail: "Joan sells turnips for 90 to 110 bells, and the price stays put until noon.",
      },
    };
  }

  const prior = priorFor(previous);
  const branches = collectBranches(buy, sells, prior);
  const mass = [0, 0, 0, 0];
  for (const branch of branches) mass[branch.pattern] += branch.weight;
  const total = mass.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return {
      status: "impossible",
      chances: emptyChances(),
      slots: Array.from({ length: 12 }, () => null),
      hint: {
        tone: "bad",
        title: "These prices cannot happen together",
        detail:
          "This price model cannot produce this set of bells in one week. Recheck Joan's price and the figures you typed.",
      },
    };
  }

  const slots: Array<SlotRange | null> = [];
  for (let slot = 0; slot < 12; slot++) {
    if (sells[slot] != null) {
      slots.push(null);
      continue;
    }
    const hist = new Float64Array(CAP);
    for (const branch of branches) {
      const pmf = branch.pmfs[slot];
      for (let price = 0; price < CAP; price++) {
        const p = pmf[price];
        if (p > 0) hist[price] += p * branch.weight;
      }
    }
    slots.push(rangeFromHist(hist));
  }

  const chances = chancesFromMass(mass);
  return {
    status: "ok",
    chances,
    slots,
    hint: describeHint(buy, sells, chances, slots, previous, branches),
  };
}

const HALF_DAYS = [
  "Monday morning",
  "Monday afternoon",
  "Tuesday morning",
  "Tuesday afternoon",
  "Wednesday morning",
  "Wednesday afternoon",
  "Thursday morning",
  "Thursday afternoon",
  "Friday morning",
  "Friday afternoon",
  "Saturday morning",
  "Saturday afternoon",
];

function peakHalfDay(branches: WeightedBranch[], pattern: number): string | null {
  let sum = 0;
  const totals = new Map<number, number>();
  for (const branch of branches) {
    if (branch.pattern !== pattern || branch.peakSlot == null || !(branch.weight > 0)) continue;
    totals.set(branch.peakSlot, (totals.get(branch.peakSlot) ?? 0) + branch.weight);
    sum += branch.weight;
  }
  if (!(sum > 0)) return null;
  let bestSlot = -1;
  let best = 0;
  for (const [slot, weight] of totals) {
    if (weight > best) {
      best = weight;
      bestSlot = slot;
    }
  }
  if (bestSlot < 0 || best / sum < 0.95) return null;
  return HALF_DAYS[bestSlot] ?? null;
}

function hasSkippedHalfDay(sells: Sell[]): boolean {
  let missed = false;
  for (const price of sells) {
    if (price == null) missed = true;
    else if (missed) return true;
  }
  return false;
}

function withSkip(detail: string, sells: Sell[]): string {
  if (!hasSkippedHalfDay(sells)) return detail;
  return `${detail} A skipped half-day leaves the ranges wider.`;
}

function neverClears(previous: PreviousChoice): string {
  if (previous === "first") {
    return "First week buying assumes the New Horizons function, which forces a small spike. That is not a proven New Leaf rule.";
  }
  if (previous === "unknown") {
    return "About 15% of weeks never clear Joan's price (14.8% in this model).";
  }
  const decreasing = priorFor(previous)[2] ?? 0;
  const pct = Math.round(decreasing * 1000) / 10;
  const shown = Number.isInteger(pct) ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
  return `With last week recorded as ${PATTERN_NAMES[previous].toLowerCase()}, ${shown} of weeks never clear Joan's price.`;
}

function hedgeSentence(largeDay: string | null): string {
  if (largeDay) {
    const next = HALF_DAYS[HALF_DAYS.indexOf(largeDay) + 1];
    if (next) {
      return `A hedge, not the usual plan, is to sell half on ${largeDay} and half on ${next}.`;
    }
  }
  return "A hedge, not the usual plan, is to sell half on the large-spike peak and half on the next half-day.";
}

function patternSentences(
  chance: (id: PatternId) => number,
  largeDay: string | null,
  smallDay: string | null,
): string {
  const parts: string[] = [];
  if (chance("fluctuating") > 0.01) {
    parts.push("Fluctuating, also called a rollercoaster, rises and falls more than once.");
  }
  if (chance("large") > 0.01) {
    parts.push(
      largeDay
        ? `A large spike pays the most on its third rise, ${largeDay}.`
        : "A large spike pays the most on its third rise.",
    );
  }
  if (chance("decreasing") > 0.01) {
    parts.push("A decreasing week does not pay you back.");
  }
  if (chance("small") > 0.01) {
    parts.push(
      smallDay
        ? `A small spike pays the most on its fourth rise, ${smallDay}.`
        : "A small spike pays the most on its fourth rise.",
    );
  }
  return parts.join(" ");
}

function describeHint(
  buy: number,
  sells: Sell[],
  chances: PatternChance[],
  slots: Array<SlotRange | null>,
  previous: PreviousChoice,
  branches: WeightedBranch[],
): Hint {
  const chance = (id: PatternId) => chances.find((item) => item.id === id)?.probability ?? 0;
  const bothSpikes = chance("large") > 0.05 && chance("small") > 0.05;
  const largeDay = peakHalfDay(branches, 1);
  const smallDay = peakHalfDay(branches, 3);
  const say = (hint: Hint): Hint => ({ ...hint, detail: withSkip(hint.detail, sells) });
  const entered: number[] = [];
  let latest: number | null = null;
  let latestIndex: number | null = null;
  let futureMax = -1;
  let futureLikelyMax = -1;
  let openSlots = 0;
  for (let i = 0; i < 12; i++) {
    const known = sells[i];
    if (known != null) {
      entered.push(known);
      latest = known;
      latestIndex = i;
    } else {
      openSlots++;
      const range = slots[i];
      if (range) {
        futureMax = Math.max(futureMax, range.max);
        futureLikelyMax = Math.max(futureLikelyMax, range.likelyMax);
      }
    }
  }

  if (openSlots === 0) {
    const leader = [...chances].sort((a, b) => b.probability - a.probability)[0];
    const detail =
      leader?.id === "fluctuating"
        ? "Fluctuating, also called a rollercoaster, matches the bells you recorded. Turnips spoil at 6:00 AM Sunday."
        : leader?.id === "decreasing"
          ? "A decreasing week does not pay you back. Turnips spoil at 6:00 AM Sunday."
          : `${leader?.name ?? "This pattern"} matches the bells you recorded. Turnips spoil at 6:00 AM Sunday.`;
    return say({
      tone: "info",
      title: "The week is filled in",
      detail,
    });
  }

  const bestKnown = entered.length > 0 ? Math.max(...entered) : -1;
  const bestPossible = Math.max(bestKnown, futureMax);

  if (chance("decreasing") >= 0.85) {
    return say({
      tone: "warn",
      title: "This is the decreasing pattern",
      detail:
        "A decreasing week does not pay you back. Thursday afternoon is the time to sell, because the spike window has shut, and waiting into Saturday deepens the loss.",
    });
  }

  if (bestPossible < buy) {
    return say({
      tone: "bad",
      title: "This week cannot pay you back",
      detail: `Every price still allowed is under Joan's ${buy}. Sell on your next visit and keep the loss small. Turnips spoil at 6:00 AM Sunday.`,
    });
  }

  if (
    latest != null &&
    latest >= buy * 2 &&
    chance("large") >= 0.5 &&
    futureMax < latest
  ) {
    const when = largeDay ?? (latestIndex != null ? HALF_DAYS[latestIndex] : null);
    const peak = when ? `${when} is the peak` : "This half-day is the peak";
    return say({
      tone: "good",
      title: "This is the large spike",
      detail: `${peak}, at ${latest} bells. Later prices step down from here. Sell to Reese before the shop changes price.`,
    });
  }

  if (chance("large") >= 0.45 && futureLikelyMax >= buy * 2) {
    const where = largeDay
      ? `A large spike pays the most on its third rise, ${largeDay}.`
      : "A large spike pays the most on its third rise, and that half-day can still land as late as Friday afternoon.";
    const hedge = bothSpikes ? ` ${hedgeSentence(largeDay)}` : "";
    return say({
      tone: "good",
      title: "A large spike is still ahead",
      detail: `${neverClears(previous)} Hold the turnips. ${where}${hedge}`,
    });
  }

  if (latest != null && futureMax <= latest && latest >= buy) {
    const peakDay =
      chance("small") >= 0.5 && smallDay
        ? smallDay
        : chance("large") >= 0.5 && largeDay
          ? largeDay
          : null;
    const named = peakDay ? `${peakDay} is the peak. ` : "";
    const roller =
      chance("fluctuating") >= 0.5
        ? "Fluctuating, also called a rollercoaster, is as high as the rest of the week gets."
        : `${latest} bells is as high as the rest of the week gets.`;
    return say({
      tone: "good",
      title: "Selling now locks the gain",
      detail: `${named}${roller} Reese is paying that price until the next change.`,
    });
  }

  if (chance("small") >= 0.5 && futureLikelyMax > (latest ?? 0) && futureMax > buy) {
    const where = smallDay
      ? `A small spike pays the most on its fourth rise, ${smallDay}.`
      : "A small spike pays the most on its fourth rise. Check again at noon, or tomorrow morning, before you sell.";
    const hedge = bothSpikes ? ` ${hedgeSentence(largeDay)}` : "";
    return say({
      tone: "good",
      title: "The small spike is still climbing",
      detail: `${neverClears(previous)} ${where}${hedge}`,
    });
  }

  if (chance("large") + chance("small") > 0.05 && futureMax > buy) {
    const hedge = bothSpikes ? ` ${hedgeSentence(largeDay)}` : "";
    return say({
      tone: "info",
      title: "A spike is still possible",
      detail: `${neverClears(previous)} ${patternSentences(chance, largeDay, smallDay)}${hedge}`,
    });
  }

  if (chance("fluctuating") >= 0.5) {
    return say({
      tone: "info",
      title: "Keep the noon check",
      detail:
        "Fluctuating, also called a rollercoaster, rises and falls more than once. Re-Tail changes price when the shop opens and again at noon. One more number will narrow the pattern.",
    });
  }

  return say({
    tone: "info",
    title: "Keep the noon check",
    detail:
      "Re-Tail changes price when the shop opens and again at noon. One more number will narrow the pattern.",
  });
}
