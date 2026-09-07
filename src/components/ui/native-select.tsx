import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../shared/lib/cn.ts";

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => <div data-slot="native-select-wrapper" className="relative"><select ref={ref} data-slot="native-select" className={cn("min-h-11 w-full appearance-none rounded-xl border border-[var(--input)] bg-[var(--background)] px-3 pr-11 text-sm text-[var(--foreground)] outline-none focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ring)_20%,transparent)] disabled:bg-[var(--muted)] disabled:opacity-60", className)} {...props}>{children}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden /></div>);
NativeSelect.displayName = "NativeSelect";
