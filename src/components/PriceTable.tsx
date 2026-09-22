import type { SlotRange } from "../engine/predict.ts";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function PriceTable({
  sells,
  slots,
}: {
  sells: Array<number | null>;
  slots: Array<SlotRange | null>;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 grid grid-cols-[2.4rem_1fr_1fr] gap-x-2 px-0.5 text-center text-xs font-bold text-ink">
        <span className="sr-only">Day</span>
        <span>AM</span>
        <span>PM</span>
      </div>
      <div className="grid grid-cols-[2.4rem_1fr_1fr] items-start gap-x-2 gap-y-2">
        {DAYS.map((day, column) => (
          <div key={day} className="contents">
            <div className="pt-1 text-left text-xs font-bold text-ink">{day}</div>
            <RangeCell sell={sells[column * 2] ?? null} range={slots[column * 2] ?? null} />
            <RangeCell sell={sells[column * 2 + 1] ?? null} range={slots[column * 2 + 1] ?? null} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RangeCell({
  sell,
  range,
}: {
  sell: number | null;
  range: SlotRange | null;
}) {
  if (sell != null) {
    return <p className="rounded-xl bg-paper px-1 py-2 text-center text-sm font-bold tabular-nums">{sell}</p>;
  }
  if (!range) {
    return <p className="rounded-xl px-1 py-2 text-center text-sm font-semibold text-soil">—</p>;
  }
  return (
    <p className="rounded-xl bg-paper px-1 py-1.5 text-center text-[11px] leading-tight tabular-nums sm:text-xs">
      <span className="block font-bold text-ink">
        {range.min}–{range.max}
      </span>
      <span className="block font-semibold text-leaf">
        {range.likelyMin}–{range.likelyMax}
      </span>
    </p>
  );
}
