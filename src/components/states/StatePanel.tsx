import { AlertCircle, Clock3, PlugZap, SearchX } from "lucide-react";

type StatePanelProps = {
  state: "empty" | "stale" | "error" | "not-connected";
  title: string;
  description: string;
};

const iconMap = {
  empty: SearchX,
  stale: Clock3,
  error: AlertCircle,
  "not-connected": PlugZap,
} as const;

export function StatePanel({ state, title, description }: StatePanelProps) {
  const Icon = iconMap[state];
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[var(--crm-border)] bg-[var(--crm-surface-muted)] p-5 text-left">
      <Icon className="h-6 w-6 text-[var(--crm-text-muted)]" strokeWidth={1.8} aria-hidden />
      <div className="space-y-2">
        <h2 className="text-lg font-semibold leading-6 text-[var(--crm-text)]">{title}</h2>
        <p className="max-w-2xl text-sm leading-5 text-[var(--crm-text-secondary)]">{description}</p>
      </div>
    </div>
  );
}
