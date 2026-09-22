import { PATTERN_IDS, PATTERN_NAMES, type PatternId, type PreviousChoice } from "../engine/patterns.ts";
import type { Forecast } from "../engine/predict.ts";
import { HALF_DAYS } from "../engine/predict.ts";
import {
  blankSells,
  type LedgerState,
  type WeekRecord,
} from "./storage.ts";

export function latestKnown(sells: Array<number | null | string>): {
  price: number | null;
  index: number | null;
} {
  let price: number | null = null;
  let index: number | null = null;
  for (let i = 0; i < 12; i++) {
    const raw = sells[i];
    if (raw === "" || raw == null) continue;
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(value)) continue;
    price = value;
    index = i;
  }
  return { price, index };
}

export function classifiedPattern(forecast: Forecast): PatternId | "unknown" {
  if (forecast.status !== "ok") return "unknown";
  const leader = [...forecast.chances].sort((a, b) => b.probability - a.probability)[0];
  if (!leader || leader.probability < 0.5) return "unknown";
  return PATTERN_IDS.includes(leader.id) ? leader.id : "unknown";
}

export function weekHasPrices(state: Pick<LedgerState, "buy" | "sells">): boolean {
  return state.buy !== "" || state.sells.some((value) => value !== "");
}

export function startNextWeek(state: LedgerState, pattern: PatternId | "unknown"): LedgerState {
  const record: WeekRecord = {
    buy: state.buy,
    sells: state.sells.slice(),
    pattern,
  };
  const history = weekHasPrices(state)
    ? [record, ...state.history].slice(0, 6)
    : state.history;
  const previous: PreviousChoice = pattern !== "unknown" ? pattern : state.previous;
  return {
    ...state,
    buy: "",
    sells: blankSells(),
    previous,
    count: "",
    friend: { ...state.friend, buy: "", sells: blankSells() },
    history,
  };
}

export function clearCurrentWeek(state: LedgerState): LedgerState {
  return {
    ...state,
    buy: "",
    sells: blankSells(),
    count: "",
  };
}

export function parseCount(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function profitBells(count: number, buy: number, price: number): number {
  return (price - buy) * count;
}

export function formatBells(n: number): string {
  const rounded = Math.round(n);
  const body = Math.abs(rounded).toLocaleString("en-US");
  if (rounded > 0) return `+${body} bells`;
  if (rounded < 0) return `−${body} bells`;
  return "0 bells";
}

export function slotFromSellTime(sellTime: string | null): number | null {
  if (!sellTime) return null;
  if (sellTime === "now") return null;
  const index = HALF_DAYS.indexOf(sellTime);
  return index >= 0 ? index : null;
}

export interface VisitAdvice {
  title: string;
  detail: string;
  tone: "good" | "info" | "warn";
}

export function visitStay(args: {
  friendName: string;
  homeLatest: number | null;
  friendLatest: number | null;
  homeRemainingMax: number | null;
  friendRemainingMax: number | null;
}): VisitAdvice | null {
  const name = args.friendName.trim() || "your friend's town";
  if (args.friendLatest == null) return null;

  if (args.homeLatest == null) {
    return {
      tone: "info",
      title: `Reese is paying ${args.friendLatest} in ${name}`,
      detail:
        "You can sell there on a visit. Add a home Re-Tail price to see whether to stay or take the train.",
    };
  }

  const home = args.homeLatest;
  const friend = args.friendLatest;
  const diff = Math.abs(friend - home);

  if (friend > home) {
    const homeCanBeat =
      args.homeRemainingMax != null && args.homeRemainingMax > friend;
    return {
      tone: "good",
      title: `Visit ${name}`,
      detail: homeCanBeat
        ? `Their Re-Tail is ${friend} vs ${home} at home (+${diff}). A home spike could still reach ${args.homeRemainingMax}, so visit for the price in hand or wait at home.`
        : `Their Re-Tail is ${friend} vs ${home} at home (+${diff}). Stay only if you cannot make the trip before Reese changes price.`,
    };
  }

  if (home > friend) {
    const friendCanBeat =
      args.friendRemainingMax != null && args.friendRemainingMax > home;
    return {
      tone: "info",
      title: "Stay home",
      detail: friendCanBeat
        ? `Your Re-Tail is ${home} vs ${friend} in ${name} (−${diff}). Their remaining max is ${args.friendRemainingMax}, so a later visit could still win.`
        : `Your Re-Tail is ${home} vs ${friend} in ${name} (−${diff}). Reese is paying more in your town.`,
    };
  }

  return {
    tone: "info",
    title: "Same price either town",
    detail: `Reese is paying ${home} at home and in ${name}. Stay, unless you were going anyway.`,
  };
}

export function patternLabel(pattern: PatternId | "unknown"): string {
  if (pattern === "unknown") return "Unclear pattern";
  return PATTERN_NAMES[pattern];
}
