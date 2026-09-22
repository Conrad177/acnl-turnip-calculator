import type { PatternId, PreviousChoice } from "../engine/patterns.ts";

const KEY = "turnip-ledger-v2";
const LEGACY_KEY = "turnip-ledger-v1";

const PREVIOUS: PreviousChoice[] = [
  "unknown",
  "first",
  "fluctuating",
  "large",
  "decreasing",
  "small",
];

const PATTERNS: Array<PatternId | "unknown"> = [
  "unknown",
  "fluctuating",
  "large",
  "decreasing",
  "small",
];

export interface FriendTown {
  name: string;
  buy: string;
  sells: string[];
}

export interface WeekRecord {
  buy: string;
  sells: string[];
  pattern: PatternId | "unknown";
}

export interface LedgerState {
  buy: string;
  sells: string[];
  previous: PreviousChoice;
  count: string;
  friend: FriendTown;
  history: WeekRecord[];
}

export function blankSells(): string[] {
  return Array.from({ length: 12 }, () => "");
}

export function blankFriend(): FriendTown {
  return { name: "", buy: "", sells: blankSells() };
}

export function blankLedger(): LedgerState {
  return {
    buy: "",
    sells: blankSells(),
    previous: "unknown",
    count: "",
    friend: blankFriend(),
    history: [],
  };
}

function digits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

function townName(value: string): string {
  return value.replace(/[<>]/g, "").slice(0, 24);
}

function padSells(value: unknown): string[] {
  const sells = Array.isArray(value)
    ? value.slice(0, 12).map((item) => (typeof item === "string" ? digits(item, 4) : ""))
    : [];
  while (sells.length < 12) sells.push("");
  return sells;
}

export function normalizeState(data: unknown): LedgerState {
  const blank = blankLedger();
  if (!data || typeof data !== "object") return blank;
  const raw = data as Partial<LedgerState> & { previous?: unknown };
  const previous = PREVIOUS.includes(raw.previous as PreviousChoice)
    ? (raw.previous as PreviousChoice)
    : "unknown";
  const friendRaw = raw.friend && typeof raw.friend === "object" ? raw.friend : blankFriend();
  const historyRaw = Array.isArray(raw.history) ? raw.history : [];
  const history: WeekRecord[] = historyRaw.slice(0, 6).map((entry) => {
    const row = entry && typeof entry === "object" ? (entry as Partial<WeekRecord>) : {};
    const pattern = PATTERNS.includes(row.pattern as PatternId | "unknown")
      ? (row.pattern as PatternId | "unknown")
      : "unknown";
    return {
      buy: typeof row.buy === "string" ? digits(row.buy, 3) : "",
      sells: padSells(row.sells),
      pattern,
    };
  });
  return {
    buy: typeof raw.buy === "string" ? digits(raw.buy, 3) : "",
    sells: padSells(raw.sells),
    previous,
    count: typeof raw.count === "string" ? digits(raw.count, 6) : "",
    friend: {
      name: typeof friendRaw.name === "string" ? townName(friendRaw.name) : "",
      buy: typeof friendRaw.buy === "string" ? digits(friendRaw.buy, 3) : "",
      sells: padSells(friendRaw.sells),
    },
    history,
  };
}

export function readLedger(): LedgerState {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return blankLedger();
    return normalizeState(JSON.parse(raw) as unknown);
  } catch {
    return blankLedger();
  }
}

export function writeLedger(state: LedgerState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export { townName, digits as storageDigits };
