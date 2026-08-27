type KpiCardProps = {
  label: string;
  value: string;
  tone?: "default" | "primary" | "soft" | "success";
};

const toneMap: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "border-[var(--crm-border)] bg-white text-[var(--crm-text)]",
  primary: "border-[var(--crm-primary)] bg-[var(--crm-primary)] text-white",
  soft: "border-sky-100 bg-sky-50 text-sky-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

export function KpiCard({ label, value, tone = "default" }: KpiCardProps) {
  return (
    <article className={`rounded-2xl border p-5 ${toneMap[tone]}`}>
      <p
        className={`text-xs font-semibold uppercase ${
          tone === "primary" ? "text-slate-300" : "text-[var(--crm-text-muted)]"
        }`}
      >
        {label}
      </p>
      <p className="mt-3 text-[30px] font-semibold leading-9 tabular-nums">{value}</p>
    </article>
  );
}
