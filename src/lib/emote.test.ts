import { describe, expect, it } from "vitest";
import type { Hint } from "../engine/predict.ts";
import { forecastWeek } from "../engine/predict.ts";
import { visitStay } from "./extras.ts";
import { emoteForHint, emoteForVisit } from "./emote.ts";

const blanks = (): Array<number | null> => Array.from({ length: 12 }, () => null);

function hint(partial: Pick<Hint, "tone" | "title">): Hint {
  return { detail: "", sellTime: null, ...partial };
}

describe("emoteForHint", () => {
  it("uses a waiting face before Sunday's price", () => {
    expect(emoteForHint(forecastWeek(null, blanks(), "unknown").hint)).toBe("waiting");
  });

  it("uses shocked for an impossible Joan price", () => {
    expect(emoteForHint(forecastWeek(50, blanks(), "unknown").hint)).toBe("shocked");
  });

  it("uses thinking while a spike is still possible", () => {
    expect(emoteForHint(forecastWeek(100, blanks(), "unknown").hint)).toBe("thinking");
  });

  it("maps remaining situations from the hint title", () => {
    expect(emoteForHint(hint({ tone: "warn", title: "This is the decreasing pattern" }))).toBe(
      "worried",
    );
    expect(emoteForHint(hint({ tone: "good", title: "This is the large spike" }))).toBe("happy");
    expect(emoteForHint(hint({ tone: "good", title: "Selling now locks the gain" }))).toBe("happy");
    expect(emoteForHint(hint({ tone: "good", title: "A large spike is still ahead" }))).toBe(
      "hopeful",
    );
    expect(emoteForHint(hint({ tone: "good", title: "The small spike is still climbing" }))).toBe(
      "hopeful",
    );
    expect(emoteForHint(hint({ tone: "bad", title: "This week cannot pay you back" }))).toBe("sad");
    expect(emoteForHint(hint({ tone: "info", title: "Keep the noon check" }))).toBe("thinking");
    expect(emoteForHint(hint({ tone: "info", title: "The week is filled in" }))).toBe("thinking");
    expect(
      emoteForHint(hint({ tone: "bad", title: "These prices cannot happen together" })),
    ).toBe("shocked");
  });
});

describe("emoteForVisit", () => {
  it("uses smug when the friend's town pays more", () => {
    const advice = visitStay({
      friendName: "Maple",
      homeLatest: 95,
      friendLatest: 140,
      homeRemainingMax: 120,
      friendRemainingMax: 140,
    });
    expect(advice).not.toBeNull();
    expect(emoteForVisit(advice!)).toBe("smug");
  });

  it("uses happy when home pays more", () => {
    const advice = visitStay({
      friendName: "Maple",
      homeLatest: 200,
      friendLatest: 110,
      homeRemainingMax: 200,
      friendRemainingMax: 150,
    });
    expect(advice).not.toBeNull();
    expect(emoteForVisit(advice!)).toBe("happy");
  });

  it("uses thinking when both towns pay the same", () => {
    const advice = visitStay({
      friendName: "Maple",
      homeLatest: 120,
      friendLatest: 120,
      homeRemainingMax: 120,
      friendRemainingMax: 140,
    });
    expect(advice).not.toBeNull();
    expect(emoteForVisit(advice!)).toBe("thinking");
  });
});
