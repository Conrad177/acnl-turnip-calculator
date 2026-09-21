import type { SlotRange } from "../engine/predict.ts";

const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PriceChart({
  buy,
  sells,
  slots,
}: {
  buy: number | null;
  sells: Array<number | null>;
  slots: Array<SlotRange | null>;
}) {
  if (buy == null) {
    return (
      <p className="flex h-48 items-center justify-center text-center text-sm text-soil">
        The chart fills in after you enter Joan's Sunday price.
      </p>
    );
  }

  const numbers = [buy];
  for (const price of sells) if (price != null) numbers.push(price);
  for (const slot of slots) {
    if (!slot) continue;
    numbers.push(slot.min, slot.max);
  }
  const yMax = Math.max(20, ...numbers);
  const width = 640;
  const height = 260;
  const padL = 42;
  const padR = 12;
  const padT = 16;
  const padB = 32;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const x = (index: number) => padL + ((index + 0.5) * innerW) / 12;
  const y = (price: number) => padT + innerH - (price / yMax) * innerH;
  const buyY = y(buy);

  const entered = sells
    .map((price, index) => (price == null ? null : { index, price }))
    .filter((point): point is { index: number; price: number } => point != null);

  let line = "";
  for (const point of entered) {
    line += `${line ? "L" : "M"}${x(point.index).toFixed(1)},${y(point.price).toFixed(1)} `;
  }

  const ticks = [0, Math.round(yMax / 2), yMax];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Turnip price chart for the twelve Re-Tail periods"
      className="h-auto w-full"
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={padL}
            x2={width - padR}
            y1={y(tick)}
            y2={y(tick)}
            stroke="#e6d3c0"
            strokeWidth="1"
          />
          <text x={padL - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#8a5a3b">
            {tick}
          </text>
        </g>
      ))}
      <line
        x1={padL}
        x2={width - padR}
        y1={buyY}
        y2={buyY}
        stroke="#6d4c7d"
        strokeDasharray="4 4"
        strokeWidth="1.5"
      />
      <text x={width - padR} y={buyY - 6} textAnchor="end" fontSize="11" fill="#6d4c7d">
        Joan {buy}
      </text>
      {slots.map((slot, index) => {
        if (!slot) return null;
        return (
          <g key={index}>
            <rect
              x={x(index) - 7}
              y={y(slot.max)}
              width="14"
              height={Math.max(1, y(slot.min) - y(slot.max))}
              rx="4"
              fill="#e7d3ef"
            />
            <rect
              x={x(index) - 4}
              y={y(slot.likelyMax)}
              width="8"
              height={Math.max(2, y(slot.likelyMin) - y(slot.likelyMax))}
              rx="3"
              fill="#2c6b45"
            />
          </g>
        );
      })}
      {entered.length > 1 ? (
        <path d={line} fill="none" stroke="#3c2a1e" strokeWidth="2" />
      ) : null}
      {entered.map((point) => (
        <circle key={point.index} cx={x(point.index)} cy={y(point.price)} r="4" fill="#3c2a1e" />
      ))}
      {LABELS.map((label, index) => (
        <text
          key={label}
          x={(x(index * 2) + x(index * 2 + 1)) / 2}
          y={height - 10}
          textAnchor="middle"
          fontSize="12"
          fill="#8a5a3b"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
