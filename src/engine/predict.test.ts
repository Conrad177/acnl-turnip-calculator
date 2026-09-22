import { describe, expect, it } from "vitest";
import { generateWeek } from "./generator.ts";
import { priorFor, steadyState, TRANSITION_COUNTS } from "./patterns.ts";
import { forecastWeek } from "./predict.ts";

const blanks = (): Array<number | null> => Array.from({ length: 12 }, () => null);

function sells(prices: Array<number | null>): Array<number | null> {
  const row = blanks();
  prices.forEach((price, index) => {
    row[index] = price;
  });
  return row;
}

describe("pattern priors", () => {
  it("uses the datamined chance gates", () => {
    for (const row of TRANSITION_COUNTS) {
      expect(row.reduce((sum, count) => sum + count, 0)).toBe(100);
    }
    expect(priorFor("large")).toEqual([0.5, 0.05, 0.2, 0.25]);
    expect(priorFor("decreasing")).toEqual([0.25, 0.45, 0.05, 0.25]);
    expect(priorFor("fluctuating")).toEqual([0.2, 0.3, 0.15, 0.35]);
    expect(priorFor("small")).toEqual([0.45, 0.25, 0.15, 0.15]);
  });

  it("uses the steady state when last week is unknown", () => {
    const steady = steadyState();
    expect(steady.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 8);
    // Exact stationary distribution of the integer transition matrix.
    expect(steady[0]).toBeCloseTo(4530 / 13082, 6);
    expect(steady[1]).toBeCloseTo(3236 / 13082, 6);
    expect(steady[2]).toBeCloseTo(1931 / 13082, 6);
    expect(steady[3]).toBeCloseTo(3385 / 13082, 6);
    const forecast = forecastWeek(100, blanks(), "unknown");
    expect(forecast.status).toBe("ok");
    forecast.chances.forEach((chance, index) => {
      expect(chance.probability).toBeCloseTo(steady[index], 6);
    });
  });

  it("treats a first purchase as a small spike", () => {
    const forecast = forecastWeek(100, blanks(), "first");
    expect(forecast.chances.map((chance) => chance.probability)).toEqual([0, 0, 0, 1]);
  });
});

describe("generator", () => {
  it("matches Treeki's published generator on a fixed seed", () => {
    expect(generateWeek(0, 1)).toEqual({
      pattern: 0,
      basePrice: 96,
      prices: [99, 117, 127, 114, 123, 65, 58, 120, 65, 61, 53, 99],
    });
  });
});

describe("generated weeks", () => {
  const samples = [1, 2, 3, 4].map((previous) => {
    let found = null as ReturnType<typeof generateWeek> | null;
    for (let seed = 1; seed < 4000 && !found; seed++) {
      const week = generateWeek(previous - 1, seed);
      if (week.pattern === previous - 1) found = week;
    }
    if (!found) throw new Error(`no sample for pattern ${previous - 1}`);
    return found;
  });

  it("stays inside Joan's buy range and returns 12 prices", () => {
    for (const week of samples) {
      expect(week.basePrice).toBeGreaterThanOrEqual(90);
      expect(week.basePrice).toBeLessThanOrEqual(110);
      expect(week.prices).toHaveLength(12);
      for (const price of week.prices) expect(price).toBeGreaterThan(0);
    }
  });

  it.each(samples.map((week, index) => [index, week] as const))(
    "accepts pattern %s and keeps later prices inside the forecast",
    (_index, week) => {
      const full = forecastWeek(week.basePrice, week.prices, "unknown");
      expect(full.status).toBe("ok");
      const leader = [...full.chances].sort((a, b) => b.probability - a.probability)[0];
      expect(leader?.id).toBe(
        ["fluctuating", "large", "decreasing", "small"][week.pattern],
      );
      expect(leader?.probability ?? 0).toBeGreaterThan(0.5);

      for (let known = 0; known < 12; known++) {
        const partial = week.prices.map((price, index) => (index < known ? price : null));
        const forecast = forecastWeek(week.basePrice, partial, "unknown");
        expect(forecast.status, `prefix ${known} rejected ${week.prices.join(",")}`).toBe("ok");
        if (known < 12) {
          const range = forecast.slots[known];
          expect(range, `missing range at ${known}`).not.toBeNull();
          expect(range!.min).toBeLessThanOrEqual(week.prices[known]);
          expect(range!.max).toBeGreaterThanOrEqual(week.prices[known]);
          expect(range!.likelyMin).toBeGreaterThanOrEqual(range!.min);
          expect(range!.likelyMax).toBeLessThanOrEqual(range!.max);
        }
      }
    },
  );
});

describe("recorded New Leaf weeks", () => {
  const weeks: Array<{ name: string; buy: number; prices: number[]; pattern: string }> = [
    {
      name: "fluctuating",
      buy: 91,
      prices: [120, 126, 125, 123, 71, 65, 60, 95, 70, 64, 86, 120],
      pattern: "fluctuating",
    },
    {
      name: "decreasing",
      buy: 94,
      prices: [82, 78, 75, 71, 67, 64, 61, 58, 53, 50, 45, 42],
      pattern: "decreasing",
    },
    {
      name: "large spike",
      buy: 110,
      prices: [99, 110, 182, 627, 199, 142, 48, 74, 52, 67, 72, 48],
      pattern: "large",
    },
    {
      name: "small spike",
      buy: 98,
      prices: [78, 73, 68, 65, 62, 58, 54, 100, 89, 139, 178, 172],
      pattern: "small",
    },
  ];

  it.each(weeks)("$name from the 2012 logs", (week) => {
    const forecast = forecastWeek(week.buy, week.prices, "unknown");
    expect(forecast.status).toBe("ok");
    const leader = [...forecast.chances].sort((a, b) => b.probability - a.probability)[0];
    expect(leader?.id).toBe(week.pattern);
    expect(leader?.probability ?? 0).toBeGreaterThan(0.5);
  });
});

describe("pattern elimination", () => {
  it("leaves only a small spike when Monday morning is near half the buy price", () => {
    const forecast = forecastWeek(100, sells([50]), "unknown");
    expect(forecast.status).toBe("ok");
    const byId = Object.fromEntries(forecast.chances.map((chance) => [chance.id, chance.probability]));
    expect(byId.small).toBeGreaterThan(0.95);
    expect(byId.fluctuating).toBeLessThan(0.02);
    expect(byId.large).toBeLessThan(0.02);
    expect(byId.decreasing).toBeLessThan(0.02);
    const mondayPm = forecast.slots[1];
    expect(mondayPm).not.toBeNull();
    expect(mondayPm!.max).toBeGreaterThan(mondayPm!.min);
  });

  it("rejects a price the generator cannot print", () => {
    const forecast = forecastWeek(100, sells([1]), "unknown");
    expect(forecast.status).toBe("impossible");
    expect(forecast.hint.tone).toBe("bad");
  });

  it("rejects a buy price Joan does not sell", () => {
    expect(forecastWeek(80, blanks(), "unknown").status).toBe("impossible");
    expect(forecastWeek(111, blanks(), "unknown").status).toBe("impossible");
  });

  it("says the week is a loss once decreasing is the only pattern left", () => {
    const week = generateWeek(2, 1);
    let decreasing = week;
    for (let seed = 1; seed < 300; seed++) {
      const candidate = generateWeek(2, seed);
      if (candidate.pattern === 2) {
        decreasing = candidate;
        break;
      }
    }
    expect(decreasing.pattern).toBe(2);
    const partial = decreasing.prices.map((price, index) => (index < 10 ? price : null));
    const forecast = forecastWeek(decreasing.basePrice, partial, "unknown");
    expect(forecast.status).toBe("ok");
    expect(forecast.chances.find((chance) => chance.id === "decreasing")?.probability).toBeGreaterThan(0.9);
    expect(forecast.hint.title.toLowerCase()).toMatch(/cannot pay|decreasing/);
  });
});

describe("empty week", () => {
  it("waits for Joan's price", () => {
    const forecast = forecastWeek(null, blanks(), "unknown");
    expect(forecast.status).toBe("empty");
    expect(`${forecast.hint.title} ${forecast.hint.detail}`.toLowerCase()).not.toContain("ledger");
  });
});
