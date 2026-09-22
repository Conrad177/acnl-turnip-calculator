import * as React from "react";
import { cn } from "../../lib/utils.ts";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-[1.75rem] border-[5px] border-orange bg-cream p-4 shadow-[0_6px_0_0_var(--color-orange-deep)] sm:p-5",
        className,
      )}
      {...props}
    />
  );
}
