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
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-5 px-3 py-5 sm:px-6 sm:py-8">
      <header className="flex items-center gap-3 rounded-[1.75rem] border-[5px] border-orange bg-cream px-4 py-3 shadow-[0_6px_0_0_var(--color-orange-deep)] sm:gap-4 sm:px-5">
        <img
          src={`${import.meta.env.BASE_URL}turnip-icon.png`}
          alt="ACNL Turnip Calculator"
          width={120}
          height={120}
          className="size-[120px] shrink-0 [image-rendering:pixelated]"
        />
        <h1 className="font-display text-3xl leading-none font-bold text-ink sm:text-4xl">
          ACNL Turnip Calculator
        </h1>
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
              onChange={(event) =>
                setLedger((current) => ({ ...current, buy: digits(event.target.value, 3) }))
              }
              className="mt-2 max-w-40 tabular-nums"
            />
          </div>
          <fieldset>
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
                  className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-[3px] border-orange bg-paper px-3 py-2 text-sm font-semibold text-ink has-[[data-state=checked]]:bg-orange has-[[data-state=checked]]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-deep"
                >
                  <RadioGroupItem id={`previous-${option.value}`} value={option.value} />
                  <span>{option.label}</span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={() => setLedger(blankLedger())}>
            Clear this week
          </Button>
        </div>
      </Card>

      <Advice hint={forecast.hint} />

      <Card>
        <h2 className="font-display mb-3 text-2xl font-bold">Re-Tail prices</h2>
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-display mb-4 text-2xl font-bold">Pattern odds</h2>
          <PatternOdds chances={forecast.chances} ready={forecast.status === "ok"} />
        </Card>
        <Card>
          <h2 className="font-display mb-2 text-2xl font-bold">Price chart</h2>
          <PriceChart buy={chartBuy} sells={sells} slots={ranges} />
        </Card>
      </div>

      <footer className="px-2 pb-4 text-center text-sm font-semibold text-white [text-shadow:0_2px_0_#3f7d22]">
        Fan-made Animal Crossing: New Leaf calculator. Not affiliated with Nintendo.
      </footer>
    </main>
  );
}
