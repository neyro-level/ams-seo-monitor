import { ChevronDown } from "lucide-react";
import type { DetailsHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "../../shared/lib/cn.ts";

export function Accordion({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="accordion" className={cn("divide-y divide-[var(--border)]", className)} {...props} />;
}

export function AccordionItem({ className, ...props }: DetailsHTMLAttributes<HTMLDetailsElement>) {
  return <details data-slot="accordion-item" className={cn("group", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return <summary data-slot="accordion-trigger" className={cn("flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]", className)} {...props}>{children}<ChevronDown className="size-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-open:rotate-180" aria-hidden /></summary>;
}

export function AccordionContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="accordion-content" className={cn("pb-4 text-sm text-[var(--text-secondary)]", className)} {...props} />;
}
