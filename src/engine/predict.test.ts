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

  it("accepts Joan's 90, 100, and 110, and rejects 89 and 111", () => {
    for (const buy of [90, 100, 110]) {
      expect(forecastWeek(buy, blanks(), "unknown").status).toBe("ok");
    }
    for (const buy of [89, 111]) {
      const forecast = forecastWeek(buy, blanks(), "unknown");
      expect(forecast.status).toBe("impossible");
      expect(forecast.hint.tone).toBe("bad");
      expect(forecast.hint.title.toLowerCase()).toMatch(/joan/);
    }
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

describe("advice copy", () => {
  it("explains the patterns after Sunday's price when last week is unknown", () => {
    const forecast = forecastWeek(100, blanks(), "unknown");
    const text = forecast.hint.detail;
    expect(forecast.hint.title).toMatch(/spike is still possible/i);
    expect(text).toMatch(/About 15% of weeks never clear Joan's price \(14\.8% in this model\)/);
    expect(text.toLowerCase()).toMatch(/rollercoaster/);
    expect(text.toLowerCase()).toMatch(/does not pay you back/);
    expect(text.toLowerCase()).toMatch(/third rise/);
    expect(text.toLowerCase()).toMatch(/fourth rise/);
    expect(text.toLowerCase()).toMatch(/hedge, not the usual plan/);
    expect(text.toLowerCase()).not.toContain("ledger");
  });

  it("uses last week's decreasing chance instead of the unknown 15%", () => {
    const forecast = forecastWeek(100, blanks(), "decreasing");
    expect(forecast.hint.detail).toMatch(/5% of weeks never clear Joan's price/);
    expect(forecast.hint.detail).not.toMatch(/14\.8%/);
    expect(forecast.hint.detail).not.toMatch(/About 15%/);
  });

  it("says a skipped half-day leaves the ranges wider", () => {
    const week = generateWeek(0, 1);
    const prices = week.prices.map((price, index) => (index === 0 || index > 3 ? null : price));
    const forecast = forecastWeek(week.basePrice, prices, "unknown");
    expect(forecast.status).toBe("ok");
    expect(forecast.hint.detail.toLowerCase()).toMatch(/ranges wider/);
    expect(forecast.hint.detail.toLowerCase()).not.toMatch(/about \d+ bells/);
  });

  it("names the large-spike peak half-day once that slot is known", () => {
    const forecast = forecastWeek(110, sells([99, 110, 182, 627]), "unknown");
    expect(forecast.status).toBe("ok");
    expect(forecast.hint.detail).toMatch(/Tuesday afternoon/);
  });

  it("labels first week buying as a New Horizons assumption", () => {
    const forecast = forecastWeek(100, blanks(), "first");
    const text = forecast.hint.detail;
    expect(text).toMatch(/New Horizons/);
    expect(text.toLowerCase()).toMatch(/assumes/);
    expect(text.toLowerCase()).toMatch(/not a proven new leaf rule/);
    expect(text.toLowerCase()).not.toMatch(/is a small spike, so/);
    expect(text).not.toMatch(/0%/);
  });

  it("uses each known last week's decreasing chance", () => {
    expect(forecastWeek(100, blanks(), "fluctuating").hint.detail).toMatch(
      /fluctuating, 15% of weeks never clear/,
    );
    expect(forecastWeek(100, blanks(), "large").hint.detail).toMatch(
      /large spike, 20% of weeks never clear/,
    );
    expect(forecastWeek(100, blanks(), "small").hint.detail).toMatch(
      /small spike, 15% of weeks never clear/,
    );
  });

  it("pattern odds sum to about 100% and change with last week", () => {
    const rows = ["unknown", "first", "fluctuating", "large", "decreasing", "small"] as const;
    const signatures = rows.map((previous) => {
      const forecast = forecastWeek(100, blanks(), previous);
      const sum = forecast.chances.reduce((total, chance) => total + chance.probability, 0);
      expect(sum).toBeCloseTo(1, 6);
      return forecast.chances.map((chance) => Math.round(chance.probability * 1000));
    });
    const unique = new Set(signatures.map((row) => row.join(",")));
    expect(unique.size).toBe(rows.length);
  });

  it("mentions the half-and-half hedge only while both spikes are open", () => {
    const open = forecastWeek(100, blanks(), "unknown");
    expect(open.hint.detail.toLowerCase()).toMatch(/hedge/);
    expect(open.hint.detail.toLowerCase()).toMatch(/sell half/);
    const smallOnly = forecastWeek(100, sells([50]), "unknown");
    expect(smallOnly.chances.find((chance) => chance.id === "large")?.probability ?? 1).toBeLessThan(0.02);
    expect(smallOnly.hint.detail.toLowerCase()).not.toMatch(/hedge/);
    expect(smallOnly.hint.detail.toLowerCase()).not.toMatch(/sell half/);
    expect(smallOnly.hint.detail.toLowerCase()).not.toMatch(/large spike/);
  });

  it("does not describe a large spike after that pattern is gone", () => {
    const forecast = forecastWeek(100, sells([95]), "unknown");
    expect(forecast.status).toBe("ok");
    expect(forecast.chances.find((chance) => chance.id === "large")?.probability ?? 1).toBeLessThan(0.01);
    expect(forecast.hint.detail.toLowerCase()).not.toMatch(/large spike/);
    expect(forecast.hint.detail.toLowerCase()).toMatch(/rollercoaster/);
    expect(forecast.hint.detail.toLowerCase()).not.toMatch(/hedge/);
    expect(forecast.hint.sellTime).toBeNull();
  });

  it("names Saturday morning once the small-spike peak is the price in hand", () => {
    const forecast = forecastWeek(
      98,
      sells([78, 73, 68, 65, 62, 58, 54, 100, 89, 139, 178]),
      "unknown",
    );
    expect(forecast.status).toBe("ok");
    expect(forecast.hint.detail).toMatch(/Saturday morning/);
    expect(forecast.hint.detail).toMatch(/178/);
  });

  it("says sell now on a locked decreasing week", () => {
    let decreasing = generateWeek(2, 1);
    for (let seed = 1; seed < 300; seed++) {
      const candidate = generateWeek(2, seed);
      if (candidate.pattern === 2) {
        decreasing = candidate;
        break;
      }
    }
    const partial = decreasing.prices.map((price, index) => (index < 10 ? price : null));
    const forecast = forecastWeek(decreasing.basePrice, partial, "unknown");
    expect(forecast.chances.find((chance) => chance.id === "decreasing")?.probability).toBeGreaterThan(0.9);
    expect(forecast.hint.detail.toLowerCase()).toMatch(/does not pay you back/);
    expect(forecast.hint.sellTime).toBe("now");
    expect(forecast.hint.detail.toLowerCase()).toMatch(/sell now/);
    expect(forecast.hint.detail.toLowerCase()).not.toMatch(/thursday afternoon is the time/);
  });

  it("names the large-spike peak half-day before that price is typed", () => {
    const forecast = forecastWeek(110, sells([99, 110, 182]), "unknown");
    expect(forecast.status).toBe("ok");
    expect(forecast.hint.sellTime).toBe("Tuesday afternoon");
    expect(forecast.remaining).not.toBeNull();
    expect(forecast.remaining!.possibleMax).toBeGreaterThanOrEqual(600);
  });

  it("names now once the large-spike peak is the price in hand", () => {
    const forecast = forecastWeek(110, sells([99, 110, 182, 627]), "unknown");
    expect(forecast.hint.sellTime).toBe("now");
    expect(forecast.hint.detail).toMatch(/Tuesday afternoon/);
  });

  it("names now at a logged small-spike peak", () => {
    const forecast = forecastWeek(
      98,
      sells([78, 73, 68, 65, 62, 58, 54, 100, 89, 139, 178]),
      "unknown",
    );
    expect(forecast.hint.sellTime).toBe("now");
    expect(forecast.hint.detail).toMatch(/Saturday morning/);
  });

  it("does not invent a sell time when both spikes are still open", () => {
    const forecast = forecastWeek(100, blanks(), "unknown");
    expect(forecast.hint.sellTime).toBeNull();
  });

  it("sells now when only fluctuating remains and 132 is the high in hand", () => {
    const forecast = forecastWeek(95, sells([null, 116, null, 56, null, 132]), "unknown");
    expect(forecast.status).toBe("ok");
    const byId = Object.fromEntries(
      forecast.chances.map((chance) => [chance.id, chance.probability]),
    );
    expect(byId.fluctuating).toBeGreaterThan(0.99);
    expect(byId.large).toBeLessThan(0.01);
    expect(byId.small).toBeLessThan(0.01);
    expect(forecast.hint.sellTime).toBe("now");
    expect(forecast.hint.title.toLowerCase()).toMatch(/selling now locks the gain/);
    expect(forecast.hint.detail.toLowerCase()).toMatch(/132/);
    expect(forecast.hint.detail.toLowerCase()).not.toMatch(/noon check/);
    expect(forecast.hint.detail.toLowerCase()).not.toMatch(/ranges wider/);
  });

  it("does not pin a half-day to a small spike that is only a sliver", () => {
    const forecast = forecastWeek(100, sells([95]), "unknown");
    expect(forecast.hint.sellTime).toBeNull();
    expect(forecast.chances.find((chance) => chance.id === "small")?.probability ?? 1).toBeLessThan(0.2);
    expect(forecast.hint.detail.toLowerCase()).not.toMatch(/tuesday afternoon/);
  });

  it("does not quote the Sunday never-clears rate after a small spike is locked", () => {
    const forecast = forecastWeek(100, sells([50]), "unknown");
    expect(forecast.chances.find((chance) => chance.id === "small")?.probability).toBe(1);
    expect(forecast.hint.detail).not.toMatch(/14\.8%/);
    expect(forecast.hint.detail).not.toMatch(/About 15%/);
    expect(forecast.hint.title.toLowerCase()).toMatch(/still climbing/);
  });

  it("sells now after the large-spike peak even when the crash is still above remaining", () => {
    const forecast = forecastWeek(110, sells([97, 93, 88, 83, 142, 202, 261, 184, 104]), "unknown");
    expect(forecast.status).toBe("ok");
    expect(forecast.chances.find((chance) => chance.id === "large")?.probability).toBeGreaterThan(0.99);
    expect(forecast.hint.sellTime).toBe("now");
    expect(forecast.hint.title.toLowerCase()).not.toMatch(/noon check/);
    expect(forecast.remaining!.possibleMax).toBeLessThan(104);
  });

  it("holds a locked fluctuating week that is still on a low", () => {
    const forecast = forecastWeek(95, sells([null, 116, null, 56]), "unknown");
    expect(forecast.chances.find((chance) => chance.id === "fluctuating")?.probability).toBeGreaterThan(0.99);
    expect(forecast.hint.sellTime).toBeNull();
    expect(forecast.hint.title.toLowerCase()).toMatch(/noon check/);
    expect(forecast.hint.detail.toLowerCase()).toMatch(/remaining highs can still beat 56/);
    expect(forecast.hint.detail.toLowerCase()).not.toMatch(/narrow the pattern/);
  });

  it("holds through a post-peak tail that can still beat the price in hand", () => {
    const forecast = forecastWeek(
      110,
      sells([97, 93, 88, 83, 142, 202, 261, 184, 104, 79, 73]),
      "unknown",
    );
    expect(forecast.hint.sellTime).not.toBe("now");
    expect(forecast.remaining!.possibleMax).toBeGreaterThan(73);
    expect(forecast.hint.title.toLowerCase()).toMatch(/cannot pay you back|noon check/);
  });

  it("surfaces a week-level guaranteed min and possible max for remaining slots", () => {
    const forecast = forecastWeek(100, blanks(), "unknown");
    expect(forecast.remaining).not.toBeNull();
    expect(forecast.remaining!.guaranteedMin).toBeGreaterThan(0);
    expect(forecast.remaining!.possibleMax).toBeGreaterThan(forecast.remaining!.guaranteedMin);
    expect(forecast.remaining!.possibleMax).toBeGreaterThanOrEqual(500);
    expect(forecast.remaining!.possibleMax).toBeLessThan(660);
    const monday = forecast.slots[0];
    expect(monday).not.toBeNull();
    expect(forecast.remaining!.guaranteedMin).toBeGreaterThanOrEqual(monday!.min);
  });

  it("keeps Monday 85 at buy 100 as a small-spike lead-in, not decreasing", () => {
    const forecast = forecastWeek(100, sells([85]), "unknown");
    expect(forecast.status).toBe("ok");
    const byId = Object.fromEntries(
      forecast.chances.map((chance) => [chance.id, chance.probability]),
    );
    expect(byId.small).toBeGreaterThan(0.99);
    expect(byId.decreasing).toBeLessThan(0.01);
    expect(byId.large).toBeLessThan(0.01);
    expect(byId.fluctuating).toBeLessThan(0.01);
    expect(forecast.remaining).not.toBeNull();
    expect(forecast.remaining!.possibleMax).toBeLessThanOrEqual(200);
    expect(forecast.remaining!.guaranteedMin).toBeGreaterThanOrEqual(140);
    expect(forecast.hint.title.toLowerCase()).toMatch(/still climbing/);
  });

  it("allows a 660-bell large-spike peak at Joan 110", () => {
    const empty = forecastWeek(110, blanks(), "unknown");
    expect(empty.remaining?.possibleMax).toBe(660);
    const peak = forecastWeek(110, sells([null, null, null, 660]), "unknown");
    expect(peak.status).toBe("ok");
    expect(peak.chances.find((chance) => chance.id === "large")?.probability).toBeGreaterThan(0.9);
    expect(peak.hint.title.toLowerCase()).toMatch(/large spike/);
  });

  it("hides remaining bounds once the week is filled in", () => {
    const forecast = forecastWeek(
      91,
      [120, 126, 125, 123, 71, 65, 60, 95, 70, 64, 86, 120],
      "unknown",
    );
    expect(forecast.status).toBe("ok");
    expect(forecast.remaining).toBeNull();
    expect(forecast.hint.sellTime).toBeNull();
  });
});

describe("empty week", () => {
  it("waits for Joan's price", () => {
    const forecast = forecastWeek(null, blanks(), "unknown");
    expect(forecast.status).toBe("empty");
    expect(`${forecast.hint.title} ${forecast.hint.detail}`.toLowerCase()).not.toContain("ledger");
  });
});
