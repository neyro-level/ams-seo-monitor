"use client";

import { useRouter } from "next/navigation";
import type { ReportPeriodKey } from "../../shared/schemas/report";

type ReportPeriodSelectorProps = {
  active: ReportPeriodKey;
  onChange?: (period: ReportPeriodKey) => void;
  basePath?: string;
};

const periods: Array<{ key: ReportPeriodKey; label: string }> = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "quarter", label: "3 месяца" },
  { key: "halfYear", label: "Полгода" },
];

export function ReportPeriodSelector({ active, onChange, basePath }: ReportPeriodSelectorProps) {
  const router = useRouter();

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
            onClick={() => {
              if (onChange) {
                onChange(period.key);
                return;
              }

              if (!basePath) {
                return;
              }

              const url = new URL(window.location.href);
              url.pathname = basePath;
              url.searchParams.set("period", period.key);
              router.replace(`${url.pathname}?${url.searchParams.toString()}`, {
                scroll: false,
              });
            }}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
