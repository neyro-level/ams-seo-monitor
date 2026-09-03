import * as React from "react";
import { cn } from "../../shared/lib/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crm-focus)] disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-[var(--crm-sidebar)] text-white hover:bg-slate-800",
        variant === "outline" && "border border-[var(--crm-border-strong)] bg-white text-slate-800 hover:bg-slate-50",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}
