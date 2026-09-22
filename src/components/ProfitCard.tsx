import type { RemainingBounds } from "../engine/predict.ts";
import { HALF_DAYS } from "../engine/predict.ts";
import { formatBells, parseCount, profitBells, slotFromSellTime } from "../lib/extras.ts";

export function ProfitCard({
  countRaw,
  buy,
  latestHome,
  latestFriend,
  friendName,
  remaining,
  sellTime,
  homeSells,
  homeRanges,
}: {
  countRaw: string;
  buy: number | null;
  latestHome: number | null;
  latestFriend: number | null;
  friendName: string;
  remaining: RemainingBounds | null;
  sellTime: string | null;
  homeSells: Array<number | null>;
  homeRanges: Array<{ min: number; max: number } | null>;
}) {
  const count = parseCount(countRaw);
  if (count == null || buy == null) return null;
  const cost = count * buy;
  const name = friendName.trim() || "your friend's town";
  const lines: string[] = [];
  if (latestHome != null) {
    lines.push(`Sell now at home (${latestHome}): ${formatBells(profitBells(count, buy, latestHome))}`);
  }
  if (latestFriend != null) {
    lines.push(
      `Sell now in ${name} (${latestFriend}): ${formatBells(profitBells(count, buy, latestFriend))}`,
    );
  }
  if (remaining) {
    lines.push(
      `If home still only reaches ${remaining.guaranteedMin}: ${formatBells(profitBells(count, buy, remaining.guaranteedMin))}`,
    );
    lines.push(
      `If home reaches ${remaining.possibleMax}: ${formatBells(profitBells(count, buy, remaining.possibleMax))}`,
    );
  }
  const namedSlot = slotFromSellTime(sellTime);
  if (sellTime === "now" && latestHome != null) {
    lines.push(`Best guess sell time is now: ${formatBells(profitBells(count, buy, latestHome))}`);
  } else if (namedSlot != null) {
    const known = homeSells[namedSlot];
    const range = homeRanges[namedSlot];
    if (known != null) {
      lines.push(
        `Best guess ${HALF_DAYS[namedSlot]} (${known}): ${formatBells(profitBells(count, buy, known))}`,
      );
    } else if (range) {
      lines.push(
        `Best guess ${HALF_DAYS[namedSlot]} (${range.min}–${range.max}): ${formatBells(profitBells(count, buy, range.min))} to ${formatBells(profitBells(count, buy, range.max))}`,
      );
    }
  }

  if (lines.length === 0) {
    lines.push("Add a Re-Tail price to see profit or loss on this stack.");
  }

  return (
    <section className="rounded-[1.75rem] border-[5px] border-orange bg-cream px-4 py-4 shadow-[0_6px_0_0_var(--color-orange-deep)] sm:px-5">
      <h2 className="font-display text-2xl font-bold">Your stack</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">
        {count.toLocaleString("en-US")} turnips cost {cost.toLocaleString("en-US")} bells at Joan's{" "}
        {buy}.
      </p>
      <ul className="mt-2 space-y-1 text-sm font-semibold leading-relaxed tabular-nums">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
