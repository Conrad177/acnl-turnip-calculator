import * as React from "react";
import { cn } from "../../lib/utils.ts";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-12 w-full rounded-2xl border-[3px] border-orange bg-paper px-3 text-lg font-bold text-ink shadow-[inset_0_3px_0_#f3e0bc] outline-none transition placeholder:text-soil/50 focus-visible:ring-4 focus-visible:ring-orange/35 aria-invalid:border-loss aria-invalid:ring-4 aria-invalid:ring-loss/30",
        className,
      )}
      {...props}
    />
  );
}
