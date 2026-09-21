import { useEffect, useMemo, useState } from "react";
import { Advice } from "./components/Advice.tsx";
import { PatternOdds } from "./components/PatternOdds.tsx";
import { PriceChart } from "./components/PriceChart.tsx";
import { WeekGrid } from "./components/WeekGrid.tsx";
import { Button } from "./components/ui/button.tsx";
import { Card } from "./components/ui/card.tsx";
import { Input } from "./components/ui/input.tsx";
import { Label } from "./components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group.tsx";
import { PATTERN_IDS, PATTERN_NAMES, type PreviousChoice } from "./engine/patterns.ts";
import { forecastWeek, type SlotRange } from "./engine/predict.ts";
import { blankLedger, readLedger, writeLedger, type LedgerState } from "./lib/storage.ts";

const PREVIOUS_OPTIONS: Array<{ value: PreviousChoice; label: string }> = [
  { value: "unknown", label: "I don't know" },
  { value: "first", label: "First week buying" },
  ...PATTERN_IDS.map((id) => ({ value: id, label: PATTERN_NAMES[id] })),
];

function digits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

export default function App() {
  const [ledger, setLedger] = useState<LedgerState>(() => readLedger());

  useEffect(() => {
    writeLedger(ledger);
  }, [ledger]);

  const buy = ledger.buy === "" ? null : Number(ledger.buy);
  const sells = ledger.sells.map((value) => (value === "" ? null : Number(value)));
  const forecast = useMemo(
    () => forecastWeek(buy, sells, ledger.previous),
    [ledger.buy, ledger.sells, ledger.previous],
  );

  const ranges: Array<SlotRange | null> =
    forecast.status === "ok" ? forecast.slots : Array.from({ length: 12 }, () => null);

  const chartBuy = buy != null && buy >= 90 && buy <= 110 ? buy : null;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-4 px-3 py-5 sm:px-6 sm:py-8">
      <header className="flex items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}turnip-icon.png`}
          alt=""
          width={64}
          height={64}
          className="size-14 rounded-2xl shadow-sm ring-1 ring-soil/20 sm:size-16"
        />
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-leaf uppercase">New Leaf</p>
          <h1 className="font-display text-3xl leading-none text-ink sm:text-4xl">Turnip Ledger</h1>
          <p className="mt-1 max-w-xl text-sm text-soil">
            Joan on Sunday morning, Reese at Re-Tail the rest of the week.
          </p>
        </div>
      </header>

      <Card>
        <div className="grid gap-5 lg:grid-cols-[14rem_1fr] lg:items-end">
          <div>
            <Label htmlFor="buy">Joan's Sunday price</Label>
            <Input
              id="buy"
              inputMode="numeric"
              autoComplete="off"
              value={ledger.buy}
              aria-invalid={forecast.status === "impossible" && ledger.buy !== ""}
              aria-describedby="buy-help"
              onChange={(event) =>
                setLedger((current) => ({ ...current, buy: digits(event.target.value, 3) }))
              }
              className="mt-2 max-w-40 tabular-nums"
            />
            <p id="buy-help" className="mt-2 text-xs leading-relaxed text-soil">
              90 to 110 bells. The price does not change until noon, and the turnips spoil at 6:00 AM next Sunday.
            </p>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Last week's pattern</legend>
            <RadioGroup
              value={ledger.previous}
              onValueChange={(value) =>
                setLedger((current) => ({ ...current, previous: value as PreviousChoice }))
              }
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3"
              aria-describedby="previous-help"
            >
              {PREVIOUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`previous-${option.value}`}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-soil/15 bg-cream/50 px-2 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf"
                >
                  <RadioGroupItem id={`previous-${option.value}`} value={option.value} />
                  <span>{option.label}</span>
                </label>
              ))}
            </RadioGroup>
            <p id="previous-help" className="mt-2 text-xs leading-relaxed text-soil">
              I don't know uses the long-run mix. First week buying assumes the small spike from the
              first-purchase flag in the datamined code.
            </p>
          </fieldset>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLedger(blankLedger())}
          >
            Clear this week
          </Button>
        </div>
      </Card>

      <Advice hint={forecast.hint} />

      <Card>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl">Re-Tail prices</h2>
          <p className="text-xs text-soil">
            Morning is before noon. Afternoon starts at noon. Empty cells show possible, then likely.
          </p>
        </div>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl">Pattern odds</h2>
          <p className="mt-1 mb-4 text-xs leading-relaxed text-soil">
            Four patterns share one generator. Last week's result changes the roll out of 100.
          </p>
          <PatternOdds chances={forecast.chances} ready={forecast.status === "ok"} />
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Price chart</h2>
          <p className="mt-1 mb-2 text-xs text-soil">
            Pale marks the possible range. Green is where most of the chance sits. Dots are prices you entered.
          </p>
          <PriceChart buy={chartBuy} sells={sells} slots={ranges} />
        </Card>
      </div>

      <footer className="pb-4 text-xs leading-relaxed text-soil">
        Fan-made ledger for Animal Crossing: New Leaf. Not affiliated with Nintendo. No Nintendo
        characters, logos, or music. Your bells, your risk — the shop can still fall short of Joan's price.
      </footer>
    </main>
  );
}
