import { describe, expect, it } from "vitest";
import { blankLedger, normalizeState } from "./storage.ts";

describe("storage normalize", () => {
  it("fills new fields when reading a v1 week", () => {
    const state = normalizeState({
      buy: "100",
      sells: ["95"],
      previous: "small",
    });
    expect(state.buy).toBe("100");
    expect(state.previous).toBe("small");
    expect(state.sells).toHaveLength(12);
    expect(state.sells[0]).toBe("95");
    expect(state.count).toBe("");
    expect(state.friend.name).toBe("");
    expect(state.friend.sells).toHaveLength(12);
    expect(state.history).toEqual([]);
  });

  it("returns a blank week for junk", () => {
    expect(normalizeState(null)).toEqual(blankLedger());
    expect(normalizeState("nope")).toEqual(blankLedger());
  });
});
