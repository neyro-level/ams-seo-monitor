import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../shared/lib/cn.ts";

const badgeVariants = cva("inline-flex items-center rounded-lg border px-2 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border-slate-200 bg-slate-50 text-slate-700",
      secondary: "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
      outline: "border-[var(--border)] bg-transparent text-[var(--foreground)]",
      destructive: "border-transparent bg-rose-50 text-rose-700",
      success: "border-transparent bg-emerald-50 text-emerald-700",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
