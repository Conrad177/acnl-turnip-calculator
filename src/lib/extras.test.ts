import { describe, expect, it } from "vitest";
import {
  classifiedPattern,
  clearCurrentWeek,
  formatBells,
  latestKnown,
  profitBells,
  startNextWeek,
  visitStay,
} from "./extras.ts";
import { forecastWeek } from "../engine/predict.ts";
import { blankLedger } from "./storage.ts";

describe("latestKnown", () => {
  it("returns the last typed half-day", () => {
    expect(latestKnown(["99", "", "110", ""])).toEqual({ price: 110, index: 2 });
    expect(latestKnown(Array.from({ length: 12 }, () => ""))).toEqual({
      price: null,
      index: null,
    });
  });
});

describe("profit", () => {
  it("uses Joan's buy as cost", () => {
    expect(profitBells(1000, 100, 140)).toBe(40000);
    expect(profitBells(1000, 100, 80)).toBe(-20000);
    expect(formatBells(40000)).toBe("+40,000 bells");
    expect(formatBells(-20000)).toBe("−20,000 bells");
    expect(formatBells(0)).toBe("0 bells");
  });
});

describe("visit or stay", () => {
  it("says visit when the friend's Re-Tail is higher", () => {
    const advice = visitStay({
      friendName: "Maple",
      homeLatest: 95,
      friendLatest: 140,
      homeRemainingMax: 120,
      friendRemainingMax: 140,
    });
    expect(advice?.title).toMatch(/Visit Maple/);
    expect(advice?.detail).toMatch(/140 vs 95/);
  });

  it("says stay when home Re-Tail is higher", () => {
    const advice = visitStay({
      friendName: "Maple",
      homeLatest: 200,
      friendLatest: 110,
      homeRemainingMax: 200,
      friendRemainingMax: 150,
    });
    expect(advice?.title).toMatch(/Stay home/);
    expect(advice?.detail).toMatch(/200 vs 110/);
  });

  it("hides the call when the friend has no price", () => {
    expect(
      visitStay({
        friendName: "Maple",
        homeLatest: 95,
        friendLatest: null,
        homeRemainingMax: 600,
        friendRemainingMax: null,
      }),
    ).toBeNull();
  });
});

describe("saved last week", () => {
  it("archives the week and fills last week's pattern", () => {
    const forecast = forecastWeek(110, [99, 110, 182, 627, 199, 142, 48, 74, 52, 67, 72, 48], "unknown");
    expect(classifiedPattern(forecast)).toBe("large");
    const started = startNextWeek(
      {
        ...blankLedger(),
        buy: "110",
        sells: ["99", "110", "182", "627", "199", "142", "48", "74", "52", "67", "72", "48"],
        previous: "unknown",
        count: "1000",
        friend: { name: "Maple", buy: "100", sells: Array.from({ length: 12 }, () => "") },
      },
      "large",
    );
    expect(started.previous).toBe("large");
    expect(started.buy).toBe("");
    expect(started.sells.every((value) => value === "")).toBe(true);
    expect(started.count).toBe("");
    expect(started.friend.name).toBe("Maple");
    expect(started.friend.buy).toBe("");
    expect(started.history).toHaveLength(1);
    expect(started.history[0]?.pattern).toBe("large");
    expect(started.history[0]?.buy).toBe("110");
  });

  it("keeps last week's pattern when clearing this week", () => {
    const cleared = clearCurrentWeek({
      ...blankLedger(),
      buy: "100",
      previous: "decreasing",
      count: "500",
      history: [{ buy: "94", sells: Array.from({ length: 12 }, () => ""), pattern: "decreasing" }],
    });
    expect(cleared.previous).toBe("decreasing");
    expect(cleared.history).toHaveLength(1);
    expect(cleared.buy).toBe("");
    expect(cleared.count).toBe("");
  });
});
