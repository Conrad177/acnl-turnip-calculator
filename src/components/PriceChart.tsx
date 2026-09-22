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
      <p className="flex h-48 items-center justify-center text-center text-sm font-semibold text-soil">
        No Sunday price yet.
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
      className="h-auto w-full font-sans"
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={padL}
            x2={width - padR}
            y1={y(tick)}
            y2={y(tick)}
            stroke="#f0d2a4"
            strokeWidth="1"
          />
          <text x={padL - 8} y={y(tick) + 4} textAnchor="end" fontSize="12" fontWeight="600" fill="#9a6230">
            {tick}
          </text>
        </g>
      ))}
      <line
        x1={padL}
        x2={width - padR}
        y1={buyY}
        y2={buyY}
        stroke="#e07a10"
        strokeDasharray="4 4"
        strokeWidth="2"
      />
      <text x={width - padR} y={buyY - 6} textAnchor="end" fontSize="12" fontWeight="700" fill="#d9780d">
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
              fill="#ffe0a3"
            />
            <rect
              x={x(index) - 4}
              y={y(slot.likelyMax)}
              width="8"
              height={Math.max(2, y(slot.likelyMin) - y(slot.likelyMax))}
              rx="3"
              fill="#3aaa34"
            />
          </g>
        );
      })}
      {entered.length > 1 ? (
        <path d={line} fill="none" stroke="#6b3e1b" strokeWidth="2.5" />
      ) : null}
      {entered.map((point) => (
        <circle key={point.index} cx={x(point.index)} cy={y(point.price)} r="5" fill="#6b3e1b" />
      ))}
      {LABELS.map((label, index) => (
        <text
          key={label}
          x={(x(index * 2) + x(index * 2 + 1)) / 2}
          y={height - 10}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#6b3e1b"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
