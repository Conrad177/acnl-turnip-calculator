import { useEffect, useMemo, useState } from "react";
import { Advice } from "./components/Advice.tsx";
import { PatternOdds } from "./components/PatternOdds.tsx";
import { PriceChart } from "./components/PriceChart.tsx";
import { ProfitCard } from "./components/ProfitCard.tsx";
import { VisitStay } from "./components/VisitStay.tsx";
import { WeekGrid } from "./components/WeekGrid.tsx";
import { WeekHistory } from "./components/WeekHistory.tsx";
import { Button } from "./components/ui/button.tsx";
import { Card } from "./components/ui/card.tsx";
import { Input } from "./components/ui/input.tsx";
import { Label } from "./components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group.tsx";
import { PATTERN_IDS, PATTERN_NAMES, type PreviousChoice } from "./engine/patterns.ts";
import { forecastWeek, type SlotRange } from "./engine/predict.ts";
import {
  classifiedPattern,
  clearCurrentWeek,
  latestKnown,
  startNextWeek,
  visitStay,
} from "./lib/extras.ts";
import { mergeShare, parseShare, serializeShare, shareHref } from "./lib/share.ts";
import { readLedger, writeLedger, type LedgerState } from "./lib/storage.ts";

const PREVIOUS_OPTIONS: Array<{ value: PreviousChoice; label: string }> = [
  { value: "unknown", label: "I don't know" },
  { value: "first", label: "First week buying" },
  ...PATTERN_IDS.map((id) => ({ value: id, label: PATTERN_NAMES[id] })),
];

function digits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

function townName(value: string): string {
  return value.replace(/[<>]/g, "").slice(0, 24);
}

function loadInitial(): LedgerState {
  const stored = readLedger();
  const fromSearch = parseShare(window.location.search);
  if (fromSearch) return mergeShare(stored, fromSearch, window.location.search);
  const fromHash = parseShare(window.location.hash);
  if (fromHash) return mergeShare(stored, fromHash, window.location.hash);
  return stored;
}

export default function App() {
  const [ledger, setLedger] = useState<LedgerState>(loadInitial);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    writeLedger(ledger);
    const next = `${window.location.pathname}${serializeShare(ledger)}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [ledger]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const buy = ledger.buy === "" ? null : Number(ledger.buy);
  const sells = ledger.sells.map((value) => (value === "" ? null : Number(value)));
  const forecast = useMemo(
    () => forecastWeek(buy, sells, ledger.previous),
    [ledger.buy, ledger.sells, ledger.previous],
  );

  const friendBuy = ledger.friend.buy === "" ? null : Number(ledger.friend.buy);
  const friendSells = ledger.friend.sells.map((value) => (value === "" ? null : Number(value)));
  const friendForecast = useMemo(
    () => forecastWeek(friendBuy, friendSells, "unknown"),
    [ledger.friend.buy, ledger.friend.sells],
  );

  const ranges: Array<SlotRange | null> =
    forecast.status === "ok" ? forecast.slots : Array.from({ length: 12 }, () => null);
  const friendRanges: Array<SlotRange | null> =
    friendForecast.status === "ok" ? friendForecast.slots : Array.from({ length: 12 }, () => null);

  const chartBuy = buy != null && buy >= 90 && buy <= 110 ? buy : null;
  const homeLatest = latestKnown(sells);
  const friendLatest = latestKnown(friendSells);
  const visit = visitStay({
    friendName: ledger.friend.name,
    homeLatest: homeLatest.price,
    friendLatest: friendLatest.price,
    homeRemainingMax: forecast.remaining?.possibleMax ?? null,
    friendRemainingMax: friendForecast.remaining?.possibleMax ?? null,
  });

  const canStartNext = ledger.buy !== "" || ledger.sells.some((value) => value !== "");

  async function copyShareLink() {
    const href = shareHref(ledger, window.location);
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      window.prompt("Copy this share link", href);
    }
  }

  function handleStartNextWeek() {
    const pattern = classifiedPattern(forecast);
    setLedger((current) => startNextWeek(current, pattern));
  }

  return (
    <main className="mx-auto flex min-h-svh w-full min-w-0 max-w-5xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-8">
      <header className="flex items-center gap-3 rounded-[1.75rem] border-[5px] border-orange bg-cream px-4 py-3 shadow-[0_6px_0_0_var(--color-orange-deep)] sm:gap-4 sm:px-5">
        <img
          src={`${import.meta.env.BASE_URL}turnip-icon.png`}
          alt="Turnip"
          width={120}
          height={120}
          className="size-14 shrink-0 [image-rendering:pixelated] sm:size-[120px]"
        />
        <h1 className="min-w-0 font-display text-[1.65rem] leading-tight font-bold text-ink sm:text-4xl">
          ACNL Turnip Calculator
        </h1>
      </header>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[12rem_12rem_1fr] lg:items-end">
          <div>
            <Label htmlFor="buy">Joan's Sunday price</Label>
            <Input
              id="buy"
              inputMode="numeric"
              autoComplete="off"
              value={ledger.buy}
              aria-invalid={forecast.status === "impossible" && ledger.buy !== ""}
              onChange={(event) =>
                setLedger((current) => ({ ...current, buy: digits(event.target.value, 3) }))
              }
              className="mt-2 max-w-full tabular-nums sm:max-w-40"
            />
          </div>
          <div>
            <Label htmlFor="count">Turnips you bought</Label>
            <Input
              id="count"
              inputMode="numeric"
              autoComplete="off"
              value={ledger.count}
              onChange={(event) =>
                setLedger((current) => ({ ...current, count: digits(event.target.value, 6) }))
              }
              className="mt-2 max-w-full tabular-nums sm:max-w-40"
            />
          </div>
          <fieldset className="sm:col-span-2 lg:col-span-1">
            <legend className="text-sm font-bold text-ink">Last week's pattern</legend>
            <RadioGroup
              value={ledger.previous}
              onValueChange={(value) =>
                setLedger((current) => ({ ...current, previous: value as PreviousChoice }))
              }
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {PREVIOUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`previous-${option.value}`}
                  className="flex min-h-12 min-w-0 cursor-pointer items-center gap-2 rounded-full border-[3px] border-orange bg-paper px-3 py-2 text-[13px] leading-snug font-semibold text-ink touch-manipulation has-[[data-state=checked]]:bg-orange has-[[data-state=checked]]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-deep sm:text-sm"
                >
                  <RadioGroupItem id={`previous-${option.value}`} value={option.value} />
                  <span className="min-w-0">{option.label}</span>
                </label>
              ))}
            </RadioGroup>
            <p id="first-week-note" className="mt-3 text-sm leading-relaxed font-semibold text-ink">
              First week buying assumes the New Horizons first-purchase function, which forces a
              small spike. It is not a proven New Leaf rule.
            </p>
          </fieldset>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void copyShareLink()}>
            {copied ? "Copied share link" : "Copy share link"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={!canStartNext}
            onClick={handleStartNextWeek}
          >
            Start next week
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={() => setLedger(clearCurrentWeek)}>
            Clear this week
          </Button>
        </div>
      </Card>

      {forecast.status !== "empty" ? (
        <Advice hint={forecast.hint} remaining={forecast.remaining} />
      ) : null}

      <ProfitCard
        countRaw={ledger.count}
        buy={chartBuy}
        latestHome={homeLatest.price}
        latestFriend={friendLatest.price}
        friendName={ledger.friend.name}
        remaining={forecast.remaining}
        sellTime={forecast.hint.sellTime}
        homeSells={sells}
        homeRanges={ranges}
      />

      <VisitStay advice={visit} />

      <Card>
        <h2 className="font-display mb-1 text-2xl font-bold">Your Re-Tail</h2>
        <p className="mb-3 text-sm font-semibold leading-relaxed text-soil">
          Reese in your town. Morning is before noon; afternoon is noon onward.
        </p>
        <WeekGrid
          sells={ledger.sells}
          ranges={ranges}
          invalid={forecast.status === "impossible"}
          onChange={(index, value) =>
            setLedger((current) => {
              const next = current.sells.slice();
              next[index] = digits(value, 4);
              return { ...current, sells: next };
            })
          }
        />
      </Card>

      <Card>
        <h2 className="font-display mb-1 text-2xl font-bold">Friend's Re-Tail</h2>
        <p className="mb-3 text-sm font-semibold leading-relaxed text-soil">
          You can sell in someone else's town. Their Sunday Joan price is optional — it only helps
          forecast their remaining slots.
        </p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="friend-name">Town name</Label>
            <Input
              id="friend-name"
              autoComplete="off"
              value={ledger.friend.name}
              placeholder="Optional"
              onChange={(event) =>
                setLedger((current) => ({
                  ...current,
                  friend: { ...current.friend, name: townName(event.target.value) },
                }))
              }
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="friend-buy">Their Joan price (if you know it)</Label>
            <Input
              id="friend-buy"
              inputMode="numeric"
              autoComplete="off"
              value={ledger.friend.buy}
              aria-invalid={friendForecast.status === "impossible" && ledger.friend.buy !== ""}
              onChange={(event) =>
                setLedger((current) => ({
                  ...current,
                  friend: { ...current.friend, buy: digits(event.target.value, 3) },
                }))
              }
              className="mt-2 tabular-nums"
            />
          </div>
        </div>
        <WeekGrid
          idPrefix="friend-sell"
          sells={ledger.friend.sells}
          ranges={friendRanges}
          invalid={friendForecast.status === "impossible"}
          onChange={(index, value) =>
            setLedger((current) => {
              const next = current.friend.sells.slice();
              next[index] = digits(value, 4);
              return { ...current, friend: { ...current.friend, sells: next } };
            })
          }
        />
      </Card>

      <WeekHistory
        history={ledger.history}
        previous={ledger.previous}
        onUsePattern={(pattern) => setLedger((current) => ({ ...current, previous: pattern }))}
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="min-w-0">
          <h2 className="font-display mb-4 text-2xl font-bold">Pattern odds</h2>
          <PatternOdds chances={forecast.chances} ready={forecast.status === "ok"} />
        </Card>
        <Card className="min-w-0">
          <h2 className="font-display mb-2 text-2xl font-bold">Price chart</h2>
          <PriceChart buy={chartBuy} sells={sells} slots={ranges} />
        </Card>
      </div>
    </main>
  );
}
