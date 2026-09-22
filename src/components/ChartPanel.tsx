import { useState } from "react";
import type { SlotRange } from "../engine/predict.ts";
import { Button } from "./ui/button.tsx";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./ui/dialog.tsx";
import { PriceChart } from "./PriceChart.tsx";
import { PriceTable } from "./PriceTable.tsx";

export function ChartPanel({
  buy,
  sells,
  slots,
}: {
  buy: number | null;
  sells: Array<number | null>;
  slots: Array<SlotRange | null>;
}) {
  const [view, setView] = useState<"numbers" | "bands">("bands");
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0">
      <div className="mb-3 flex gap-2">
        <ToggleChip pressed={view === "numbers"} onClick={() => setView("numbers")}>
          Numbers
        </ToggleChip>
        <ToggleChip pressed={view === "bands"} onClick={() => setView("bands")}>
          Bands
        </ToggleChip>
      </div>
      {view === "numbers" ? (
        <PriceTable sells={sells} slots={slots} />
      ) : (
        <>
          <button
            type="button"
            className="block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-deep"
            onClick={() => {
              if (buy != null) setOpen(true);
            }}
          >
            <PriceChart buy={buy} sells={sells} slots={slots} />
            {buy != null ? (
              <span className="mt-1 block text-center text-xs font-semibold text-soil">
                Tap for a bigger chart
              </span>
            ) : null}
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <div className="mb-3 flex items-start justify-between gap-3">
                <DialogTitle>Price chart</DialogTitle>
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="shrink-0">
                    Close
                  </Button>
                </DialogClose>
              </div>
              <PriceChart buy={buy} sells={sells} slots={slots} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function ToggleChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        pressed
          ? "h-11 min-w-0 flex-1 rounded-full border-[3px] border-orange bg-orange px-3 text-sm font-bold text-white"
          : "h-11 min-w-0 flex-1 rounded-full border-[3px] border-orange bg-paper px-3 text-sm font-bold text-ink"
      }
    >
      {children}
    </button>
  );
}
