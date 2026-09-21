import * as React from "react";
import { cn } from "../../lib/utils.ts";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-3xl bg-paper p-4 shadow-sm ring-1 ring-soil/15 sm:p-5", className)}
      {...props}
    />
  );
}
