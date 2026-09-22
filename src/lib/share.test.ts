import { describe, expect, it } from "vitest";
import { mergeShare, parseShare, serializeShare, shareHref } from "./share.ts";
import { blankLedger } from "./storage.ts";

describe("shareable URL", () => {
  it("round-trips buy, last pattern, and a week of prices", () => {
    const state = {
      ...blankLedger(),
      buy: "100",
      previous: "decreasing" as const,
      sells: ["95", "90", "", "88", "", "", "", "", "", "", "", ""],
    };
    const encoded = serializeShare(state);
    expect(encoded).toMatch(/^\?/);
    expect(encoded).toContain("buy=100");
    expect(encoded).toContain("last=decreasing");
    expect(encoded).toContain("prices=");
    expect(parseShare(encoded)).toEqual(state);
    expect(parseShare(encoded.slice(1))).toEqual(state);
  });

  it("loads a hash the same way as a query string", () => {
    const state = parseShare("#buy=110&prices=99.110&last=first");
    expect(state?.buy).toBe("110");
    expect(state?.previous).toBe("first");
    expect(state?.sells[0]).toBe("99");
    expect(state?.sells[1]).toBe("110");
    expect(state?.sells.slice(2).every((value) => value === "")).toBe(true);
  });

  it("returns null when the URL has no share keys, so localStorage can be used", () => {
    expect(parseShare("")).toBeNull();
    expect(parseShare("?")).toBeNull();
    expect(parseShare("?utm=home")).toBeNull();
    expect(serializeShare(blankLedger())).toBe("");
  });

  it("builds an absolute link from the current page path", () => {
    const href = shareHref(
      {
        ...blankLedger(),
        buy: "91",
        previous: "unknown",
        sells: Array.from({ length: 12 }, () => ""),
      },
      { origin: "https://example.com", pathname: "/acnl-turnip-calculator/" },
    );
    expect(href).toBe(
      "https://example.com/acnl-turnip-calculator/?buy=91&prices=...........&last=unknown",
    );
  });

  it("strips non-digits and unknown last-week labels", () => {
    const state = parseShare("?buy=10a0&prices=9x5.abc&last=island");
    expect(state?.buy).toBe("100");
    expect(state?.sells[0]).toBe("95");
    expect(state?.sells[1]).toBe("");
    expect(state?.previous).toBe("unknown");
  });

  it("round-trips turnip count and a friend's Re-Tail week", () => {
    const state = {
      ...blankLedger(),
      buy: "100",
      count: "1000",
      friend: {
        name: "Maple",
        buy: "105",
        sells: ["140", "", "", "", "", "", "", "", "", "", "", ""],
      },
    };
    const encoded = serializeShare(state);
    expect(encoded).toContain("count=1000");
    expect(encoded).toContain("fname=Maple");
    expect(encoded).toContain("fbuy=105");
    const parsed = parseShare(encoded);
    expect(parsed?.count).toBe("1000");
    expect(parsed?.friend).toEqual(state.friend);
  });

  it("keeps stored history and friend when the URL is only the home week", () => {
    const stored = {
      ...blankLedger(),
      count: "400",
      friend: { name: "Maple", buy: "", sells: Array.from({ length: 12 }, () => "") },
      history: [
        {
          buy: "94",
          sells: Array.from({ length: 12 }, () => ""),
          pattern: "decreasing" as const,
        },
      ],
    };
    const fromUrl = parseShare("?buy=100&prices=95...........&last=decreasing");
    expect(fromUrl).not.toBeNull();
    const merged = mergeShare(stored, fromUrl!, "?buy=100&prices=95...........&last=decreasing");
    expect(merged.buy).toBe("100");
    expect(merged.previous).toBe("decreasing");
    expect(merged.count).toBe("400");
    expect(merged.friend.name).toBe("Maple");
    expect(merged.history).toHaveLength(1);
  });
});
