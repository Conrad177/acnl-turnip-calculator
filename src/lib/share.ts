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

function hasShareKeys(params: URLSearchParams): boolean {
  return params.has("buy") || params.has("prices") || params.has("last");
}

/** Read buy / twelve sells / last pattern from a query string or hash. */
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
  const priceParts = (params.get("prices") ?? "").split(".");
  const sells = Array.from({ length: 12 }, (_, index) =>
    typeof priceParts[index] === "string" ? digits(priceParts[index], 4) : "",
  );
  return {
    buy: digits(params.get("buy") ?? "", 3),
    sells,
    previous,
  };
}

export function serializeShare(state: LedgerState): string {
  const blank = blankLedger();
  const empty =
    state.buy === blank.buy &&
    state.previous === blank.previous &&
    state.sells.every((value) => value === "");
  if (empty) return "";
  const params = new URLSearchParams();
  params.set("buy", state.buy);
  params.set("prices", state.sells.join("."));
  params.set("last", state.previous);
  return `?${params.toString()}`;
}

export function shareHref(
  state: LedgerState,
  loc: Pick<Location, "origin" | "pathname">,
): string {
  return `${loc.origin}${loc.pathname}${serializeShare(state)}`;
}
