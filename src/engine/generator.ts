/**
 * Float32 port of the stalk-market generator published by Ninji (Treeki):
 * https://gist.github.com/Treeki/85be14d297c80c8b3c0a76375743325b
 *
 * New Leaf sell logs from 2012 follow these same phases and rate bands.
 * The first-purchase small-spike override is commented out in that gist,
 * so this generator does not force it.
 */

const f32 = Math.fround;

function u32(n: number): number {
  return n >>> 0;
}

export class SeadRandom {
  private readonly state: Uint32Array;

  constructor(seed: number) {
    const state = new Uint32Array(4);
    let x = u32(seed);
    state[0] = u32(Math.imul(0x6c078965, u32(x ^ (x >>> 30))) + 1);
    state[1] = u32(Math.imul(0x6c078965, u32(state[0] ^ (state[0] >>> 30))) + 2);
    state[2] = u32(Math.imul(0x6c078965, u32(state[1] ^ (state[1] >>> 30))) + 3);
    state[3] = u32(Math.imul(0x6c078965, u32(state[2] ^ (state[2] >>> 30))) + 4);
    this.state = state;
  }

  getU32(): number {
    const state = this.state;
    const n = u32(state[0] ^ (state[0] << 11));
    state[0] = state[1];
    state[1] = state[2];
    state[2] = state[3];
    state[3] = u32(n ^ (n >>> 8) ^ state[3] ^ (state[3] >>> 19));
    return state[3];
  }

  randbool(): boolean {
    return (this.getU32() & 0x80000000) !== 0;
  }

  randint(min: number, max: number): number {
    const span = max - min + 1;
    const roll = this.getU32();
    return Math.floor((roll * span) / 4294967296) + min;
  }

  randfloat(a: number, b: number): number {
    const bits = u32(0x3f800000 | (this.getU32() >>> 9));
    const view = new DataView(new ArrayBuffer(4));
    view.setUint32(0, bits, true);
    const fval = new Float32Array(view.buffer)[0] ?? 1;
    const a32 = f32(a);
    const b32 = f32(b);
    const t = f32(fval - 1);
    const d = f32(b32 - a32);
    return f32(a32 + f32(t * d));
  }
}

export function intceil(val: number): number {
  return Math.trunc(f32(val + f32(0.99999)));
}

function priced(rate: number, base: number): number {
  return intceil(f32(rate * f32(base)));
}

/** Previous pattern 0–3. A value outside that range becomes decreasing, as in the gist. */
export function selectPattern(previous: number, chance: number): number {
  if (previous >= 4 || previous < 0) return 2;
  const gates = [
    [20, 50, 65],
    [50, 55, 75],
    [25, 70, 75],
    [45, 70, 85],
  ][previous];
  if (!gates) return 2;
  if (chance < gates[0]) return 0;
  if (chance < gates[1]) return 1;
  if (chance < gates[2]) return 2;
  return 3;
}

export interface GeneratedWeek {
  pattern: number;
  basePrice: number;
  /** Monday AM through Saturday PM. */
  prices: number[];
}

export function generateWeek(previousPattern: number, seed: number): GeneratedWeek {
  const rng = new SeadRandom(seed);
  const basePrice = rng.randint(90, 110);
  const chance = rng.randint(0, 99);
  const pattern = selectPattern(previousPattern, chance);
  const sell = new Array<number>(14).fill(0);

  if (pattern === 0) {
    let work = 2;
    const decPhaseLen1 = rng.randbool() ? 3 : 2;
    const decPhaseLen2 = 5 - decPhaseLen1;
    const hiPhaseLen1 = rng.randint(0, 6);
    const hiPhaseLen2and3 = 7 - hiPhaseLen1;
    const hiPhaseLen3 = rng.randint(0, hiPhaseLen2and3 - 1);

    for (let i = 0; i < hiPhaseLen1; i++) {
      sell[work++] = priced(rng.randfloat(0.9, 1.4), basePrice);
    }
    let rate = rng.randfloat(0.8, 0.6);
    for (let i = 0; i < decPhaseLen1; i++) {
      sell[work++] = priced(rate, basePrice);
      rate = f32(rate - f32(0.04));
      rate = f32(rate - rng.randfloat(0, 0.06));
    }
    for (let i = 0; i < hiPhaseLen2and3 - hiPhaseLen3; i++) {
      sell[work++] = priced(rng.randfloat(0.9, 1.4), basePrice);
    }
    rate = rng.randfloat(0.8, 0.6);
    for (let i = 0; i < decPhaseLen2; i++) {
      sell[work++] = priced(rate, basePrice);
      rate = f32(rate - f32(0.04));
      rate = f32(rate - rng.randfloat(0, 0.06));
    }
    for (let i = 0; i < hiPhaseLen3; i++) {
      sell[work++] = priced(rng.randfloat(0.9, 1.4), basePrice);
    }
  } else if (pattern === 1) {
    const peakStart = rng.randint(3, 9);
    let rate = rng.randfloat(0.9, 0.85);
    let work = 2;
    for (; work < peakStart; work++) {
      sell[work] = priced(rate, basePrice);
      rate = f32(rate - f32(0.03));
      rate = f32(rate - rng.randfloat(0, 0.02));
    }
    sell[work++] = priced(rng.randfloat(0.9, 1.4), basePrice);
    sell[work++] = priced(rng.randfloat(1.4, 2.0), basePrice);
    sell[work++] = priced(rng.randfloat(2.0, 6.0), basePrice);
    sell[work++] = priced(rng.randfloat(1.4, 2.0), basePrice);
    sell[work++] = priced(rng.randfloat(0.9, 1.4), basePrice);
    for (; work < 14; work++) {
      sell[work] = priced(rng.randfloat(0.4, 0.9), basePrice);
    }
  } else if (pattern === 2) {
    let rate = f32(0.9);
    rate = f32(rate - rng.randfloat(0, 0.05));
    for (let work = 2; work < 14; work++) {
      sell[work] = priced(rate, basePrice);
      rate = f32(rate - f32(0.03));
      rate = f32(rate - rng.randfloat(0, 0.02));
    }
  } else {
    const peakStart = rng.randint(2, 9);
    let rate = rng.randfloat(0.9, 0.4);
    let work = 2;
    for (; work < peakStart; work++) {
      sell[work] = priced(rate, basePrice);
      rate = f32(rate - f32(0.03));
      rate = f32(rate - rng.randfloat(0, 0.02));
    }
    sell[work++] = priced(rng.randfloat(0.9, 1.4), basePrice);
    sell[work++] = priced(rng.randfloat(0.9, 1.4), basePrice);
    rate = rng.randfloat(1.4, 2.0);
    sell[work++] = priced(rng.randfloat(1.4, rate), basePrice) - 1;
    sell[work++] = priced(rate, basePrice);
    sell[work++] = priced(rng.randfloat(1.4, rate), basePrice) - 1;
    if (work < 14) {
      rate = rng.randfloat(0.9, 0.4);
      for (; work < 14; work++) {
        sell[work] = priced(rate, basePrice);
        rate = f32(rate - f32(0.03));
        rate = f32(rate - rng.randfloat(0, 0.02));
      }
    }
  }

  return { pattern, basePrice, prices: sell.slice(2) };
}
