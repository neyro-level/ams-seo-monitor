import type { HTMLAttributes } from "react";
import { cn } from "../../shared/lib/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700",
        className,
      )}
      {...props}
    />
  );
}
