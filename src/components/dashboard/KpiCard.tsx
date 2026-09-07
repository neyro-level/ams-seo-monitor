type KpiCardProps = {
  label: string;
  value: string;
  tone?: "default" | "primary" | "soft" | "success";
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
};

const toneMap: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]",
  primary: "border-[var(--primary)] bg-[var(--primary)] text-white",
  soft: "border-[var(--info)]/20 bg-[var(--info-soft)] text-[var(--foreground)]",
  success: "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--foreground)]",
};

export function KpiCard({
  label,
  value,
  tone = "default",
  delta,
  deltaTone = "neutral",
}: KpiCardProps) {
  return (
    <article className={`rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-surface)] ${toneMap[tone]}`}>
      <p
        className={`text-xs font-semibold uppercase ${
          tone === "primary" ? "text-slate-300" : "text-[var(--muted-foreground)]"
        }`}
      >
        {label}
      </p>
      <p className="mt-3 text-[30px] font-semibold leading-9 tabular-nums">{value}</p>
      {delta ? (
        <p
          className={[
            "mt-2 text-xs font-semibold tabular-nums",
            tone === "primary"
              ? "text-slate-200"
              : deltaTone === "positive"
                ? "text-[var(--success)]"
                : deltaTone === "negative"
                  ? "text-[var(--destructive)]"
                  : "text-[var(--muted-foreground)]",
          ].join(" ")}
        >
          {delta}
        </p>
      ) : null}
    </article>
  );
}
