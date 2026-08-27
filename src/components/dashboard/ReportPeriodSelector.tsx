"use client";

import type { ReportPeriodKey } from "../../shared/schemas/report";

type ReportPeriodSelectorProps = {
  active: ReportPeriodKey;
  onChange: (period: ReportPeriodKey) => void;
};

const periods: Array<{ key: ReportPeriodKey; label: string }> = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "quarter", label: "Квартал" },
  { key: "halfYear", label: "Полгода" },
];

export function ReportPeriodSelector({ active, onChange }: ReportPeriodSelectorProps) {
  return (
    <div
      className="inline-flex max-w-full overflow-x-auto rounded-xl border border-[var(--crm-border)] bg-white p-1 shadow-sm"
      aria-label="Период отчёта"
    >
      {periods.map((period) => {
        const selected = active === period.key;
        return (
          <button
            key={period.key}
            type="button"
            className={[
              "min-h-10 shrink-0 whitespace-nowrap rounded-lg px-2 text-sm font-semibold transition-colors sm:px-4",
              selected
                ? "bg-[var(--crm-primary)] text-white"
                : "text-[var(--crm-text-secondary)] hover:bg-slate-100",
            ].join(" ")}
            aria-pressed={selected}
            onClick={() => onChange(period.key)}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
