import type { PreviousChoice } from "../engine/patterns.ts";
import { blankLedger, type LedgerState } from "./storage.ts";

const LAST: PreviousChoice[] = [
  "unknown",
  "first",
  "fluctuating",
  "large",
  "decreasing",
  "small",
];

function digits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

function townName(value: string): string {
  return value.replace(/[<>]/g, "").slice(0, 24);
}

function padPrices(raw: string): string[] {
  const parts = raw.split(".");
  return Array.from({ length: 12 }, (_, index) =>
    typeof parts[index] === "string" ? digits(parts[index], 4) : "",
  );
}

function hasShareKeys(params: URLSearchParams): boolean {
  return (
    params.has("buy") ||
    params.has("prices") ||
    params.has("last") ||
    params.has("count") ||
    params.has("fname") ||
    params.has("fbuy") ||
    params.has("fprices")
  );
}

export function shareKeyFlags(searchOrHash: string): { count: boolean; friend: boolean } {
  const stripped = searchOrHash.trim().replace(/^[?#]/, "");
  const params = new URLSearchParams(stripped);
  return {
    count: params.has("count"),
    friend: params.has("fname") || params.has("fbuy") || params.has("fprices"),
  };
}

/** Read buy / twelve sells / last pattern, plus count and friend town when present. */
export function parseShare(searchOrHash: string): LedgerState | null {
  const raw = searchOrHash.trim();
  if (!raw) return null;
  const stripped = raw.replace(/^[?#]/, "");
  if (!stripped) return null;
  const params = new URLSearchParams(stripped);
  if (!hasShareKeys(params)) return null;
  const lastRaw = params.get("last") ?? "unknown";
  const previous = LAST.includes(lastRaw as PreviousChoice)
    ? (lastRaw as PreviousChoice)
    : "unknown";
  return {
    buy: digits(params.get("buy") ?? "", 3),
    sells: padPrices(params.get("prices") ?? ""),
    previous,
    count: digits(params.get("count") ?? "", 6),
    friend: {
      name: townName(params.get("fname") ?? ""),
      buy: digits(params.get("fbuy") ?? "", 3),
      sells: padPrices(params.get("fprices") ?? ""),
    },
    history: [],
  };
}

function friendHasData(state: LedgerState): boolean {
  return (
    state.friend.name !== "" ||
    state.friend.buy !== "" ||
    state.friend.sells.some((value) => value !== "")
  );
}

export function serializeShare(state: LedgerState): string {
  const blank = blankLedger();
  const empty =
    state.buy === blank.buy &&
    state.previous === blank.previous &&
    state.count === blank.count &&
    state.sells.every((value) => value === "") &&
    !friendHasData(state);
  if (empty) return "";
  const params = new URLSearchParams();
  params.set("buy", state.buy);
  params.set("prices", state.sells.join("."));
  params.set("last", state.previous);
  if (state.count) params.set("count", state.count);
  if (friendHasData(state)) {
    params.set("fname", state.friend.name);
    params.set("fbuy", state.friend.buy);
    params.set("fprices", state.friend.sells.join("."));
  }
  return `?${params.toString()}`;
}

export function shareHref(
  state: LedgerState,
  loc: Pick<Location, "origin" | "pathname">,
): string {
  return `${loc.origin}${loc.pathname}${serializeShare(state)}`;
}

export function mergeShare(
  stored: LedgerState,
  fromUrl: LedgerState,
  searchOrHash: string,
): LedgerState {
  const flags = shareKeyFlags(searchOrHash);
  return {
    ...fromUrl,
    history: stored.history,
    count: flags.count ? fromUrl.count : stored.count,
    friend: flags.friend ? fromUrl.friend : stored.friend,
  };
}
