import * as React from "react";
import { cn } from "../../lib/utils.ts";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-soil/25 bg-paper px-3 text-base text-ink shadow-inner shadow-soil/5 outline-none transition placeholder:text-soil/50 focus-visible:border-leaf focus-visible:ring-2 focus-visible:ring-leaf/40 aria-invalid:border-loss aria-invalid:ring-2 aria-invalid:ring-loss/30",
        className,
      )}
      {...props}
    />
  );
}
