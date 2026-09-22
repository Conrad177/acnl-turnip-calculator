import { Input } from "./ui/input.tsx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function WeekGrid({
  sells,
  ranges,
  invalid,
  onChange,
  idPrefix = "sell",
}: {
  sells: string[];
  ranges: Array<{ min: number; max: number; likelyMin: number; likelyMax: number } | null>;
  invalid: boolean;
  onChange: (index: number, value: string) => void;
  idPrefix?: string;
}) {
  return (
    <>
      <div className="lg:hidden">
        <div className="mb-1 grid grid-cols-[2.4rem_1fr_1fr] gap-x-2 px-0.5 text-center text-xs font-bold text-ink">
          <span className="sr-only">Day</span>
          <span>AM</span>
          <span>PM</span>
        </div>
        <div className="grid grid-cols-[2.4rem_1fr_1fr] items-start gap-x-2 gap-y-3">
          {DAYS.map((day, column) => (
            <DayCells
              key={day}
              day={day}
              column={column}
              sells={sells}
              ranges={ranges}
              invalid={invalid}
              onChange={onChange}
              idPrefix={idPrefix}
            />
          ))}
        </div>
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full table-fixed border-separate border-spacing-1 text-center">
          <caption className="sr-only">
            Re-Tail sell prices from Monday morning through Saturday afternoon.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-12" />
              {DAYS.map((day) => (
                <th key={day} scope="col" className="pb-1 text-sm font-bold text-ink">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["Morning", "Afternoon"] as const).map((period, row) => (
              <tr key={period}>
                <th scope="row" className="pr-1 text-left text-xs font-bold text-ink">
                  {period === "Morning" ? "AM" : "PM"}
                  <span className="sr-only">
                    {period === "Morning" ? ", before noon" : ", noon onward"}
                  </span>
                </th>
                {DAYS.map((day, column) => {
                  const index = column * 2 + row;
                  return (
                    <td key={day} className="align-top">
                      <PriceCell
                        index={index}
                        day={day}
                        period={period}
                        sells={sells}
                        ranges={ranges}
                        invalid={invalid}
                        onChange={onChange}
                        idPrefix={idPrefix}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DayCells({
  day,
  column,
  sells,
  ranges,
  invalid,
  onChange,
  idPrefix,
}: {
  day: string;
  column: number;
  sells: string[];
  ranges: Array<{ min: number; max: number; likelyMin: number; likelyMax: number } | null>;
  invalid: boolean;
  onChange: (index: number, value: string) => void;
  idPrefix: string;
}) {
  return (
    <>
      <div className="pt-3 text-left text-xs font-bold text-ink">{day}</div>
      <PriceCell
        index={column * 2}
        day={day}
        period="Morning"
        sells={sells}
        ranges={ranges}
        invalid={invalid}
        onChange={onChange}
        idPrefix={idPrefix}
      />
      <PriceCell
        index={column * 2 + 1}
        day={day}
        period="Afternoon"
        sells={sells}
        ranges={ranges}
        invalid={invalid}
        onChange={onChange}
        idPrefix={idPrefix}
      />
    </>
  );
}

function PriceCell({
  index,
  day,
  period,
  sells,
  ranges,
  invalid,
  onChange,
  idPrefix,
}: {
  index: number;
  day: string;
  period: "Morning" | "Afternoon";
  sells: string[];
  ranges: Array<{ min: number; max: number; likelyMin: number; likelyMax: number } | null>;
  invalid: boolean;
  onChange: (index: number, value: string) => void;
  idPrefix: string;
}) {
  const range = ranges[index];
  const id = `${idPrefix}-${index}`;
  const describedBy = range ? `${id}-range` : undefined;
  return (
    <div>
      <label className="sr-only" htmlFor={id}>
        {day} {period.toLowerCase()} sell price
      </label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={sells[index] ?? ""}
        aria-invalid={invalid && (sells[index] ?? "") !== ""}
        aria-describedby={describedBy}
        onChange={(event) => onChange(index, event.target.value)}
        className="h-12 rounded-2xl px-1 text-center text-base font-bold tabular-nums lg:h-11 lg:text-sm"
      />
      <p id={describedBy} className="mt-1 min-h-8 text-[11px] leading-tight text-soil tabular-nums">
        {range ? (
          <>
            <span className="block">
              {range.min}–{range.max}
            </span>
            <span className="block text-leaf">
              {range.likelyMin}–{range.likelyMax}
            </span>
          </>
        ) : (
          <span className="sr-only">Recorded price</span>
        )}
      </p>
    </div>
  );
}
