import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "../../shared/lib/cn.ts";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div data-slot="select-wrapper" className="relative">
      <select ref={ref} data-slot="select" className={cn("min-h-11 w-full appearance-none rounded-[var(--radius-control)] border border-[var(--input)] bg-[var(--card)] px-3 pr-12 text-sm text-[var(--foreground)] outline-none transition focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ring)_20%,transparent)] disabled:bg-[var(--muted)] disabled:opacity-60 aria-invalid:border-[var(--destructive)]", className)} {...props}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden />
    </div>
  ),
);
Select.displayName = "Select";
