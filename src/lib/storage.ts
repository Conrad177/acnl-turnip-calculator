import type { PreviousChoice } from "../engine/patterns.ts";

const KEY = "turnip-ledger-v1";

const PREVIOUS: PreviousChoice[] = [
  "unknown",
  "first",
  "fluctuating",
  "large",
  "decreasing",
  "small",
];

export interface LedgerState {
  buy: string;
  sells: string[];
  previous: PreviousChoice;
}

export function blankLedger(): LedgerState {
  return { buy: "", sells: Array.from({ length: 12 }, () => ""), previous: "unknown" };
}

function digits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

export function readLedger(): LedgerState {
  const blank = blankLedger();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank;
    const data = JSON.parse(raw) as Partial<LedgerState>;
    const previous = PREVIOUS.includes(data.previous as PreviousChoice)
      ? (data.previous as PreviousChoice)
      : "unknown";
    const sells = Array.isArray(data.sells)
      ? data.sells.slice(0, 12).map((value) => (typeof value === "string" ? digits(value, 4) : ""))
      : [];
    while (sells.length < 12) sells.push("");
    return {
      buy: typeof data.buy === "string" ? digits(data.buy, 3) : "",
      sells,
      previous,
    };
  } catch {
    return blank;
  }
}

export function writeLedger(state: LedgerState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}
