import { Input } from "./ui/input.tsx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function WeekGrid({
  sells,
  ranges,
  invalid,
  onChange,
}: {
  sells: string[];
  ranges: Array<{ min: number; max: number; likelyMin: number; likelyMax: number } | null>;
  invalid: boolean;
  onChange: (index: number, value: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
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
                const range = ranges[index];
                const describedBy = range ? `range-${index}` : undefined;
                return (
                  <td key={day} className="align-top">
                    <label className="sr-only" htmlFor={`sell-${index}`}>
                      {day} {period.toLowerCase()} sell price
                    </label>
                    <Input
                      id={`sell-${index}`}
                      inputMode="numeric"
                      autoComplete="off"
                      value={sells[index] ?? ""}
                      aria-invalid={invalid && (sells[index] ?? "") !== ""}
                      aria-describedby={describedBy}
                      onChange={(event) => onChange(index, event.target.value)}
                      className="h-11 rounded-2xl px-1 text-center text-sm font-bold tabular-nums"
                    />
                    <p
                      id={describedBy}
                      className="mt-1 min-h-8 text-[10px] leading-tight text-soil tabular-nums"
                    >
                      {range ? (
                        <>
                          <span className="block">{range.min}–{range.max}</span>
                          <span className="block text-leaf">{range.likelyMin}–{range.likelyMax}</span>
                        </>
                      ) : (
                        <span className="sr-only">Recorded price</span>
                      )}
                    </p>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
