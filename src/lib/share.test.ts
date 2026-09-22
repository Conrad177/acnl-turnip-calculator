import { describe, expect, it } from "vitest";
import { parseShare, serializeShare, shareHref } from "./share.ts";
import { blankLedger } from "./storage.ts";

describe("shareable URL", () => {
  it("round-trips buy, last pattern, and a week of prices", () => {
    const state = {
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
});
