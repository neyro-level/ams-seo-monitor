type KpiCardProps = {
  label: string;
  value: string;
  tone?: "default" | "primary" | "accent" | "soft";
  hint?: string;
};

const toneMap: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-white text-[var(--report-text)]",
  primary: "bg-[var(--report-sidebar)] text-white",
  accent: "bg-[var(--report-accent)] text-white",
  soft: "bg-[var(--report-surface-muted)] text-[var(--report-text)]",
};

export function KpiCard({ label, value, tone = "default", hint }: KpiCardProps) {
  return (
    <article
      className={`rounded-[8px] border border-[var(--report-border)] p-4 sm:p-5 ${toneMap[tone]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-3 text-[30px] font-semibold leading-none tabular-nums sm:text-[32px]">{value}</p>
      {hint ? <p className="mt-3 text-xs leading-4 opacity-85">{hint}</p> : null}
    </article>
  );
}
