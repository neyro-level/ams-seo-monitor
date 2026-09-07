"use client";

import { useRouter } from "next/navigation";
import type { ReportPeriodKey } from "../../shared/schemas/report.ts";
import { Button } from "../ui/button.tsx";

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
      className="inline-flex max-w-full overflow-x-auto rounded-xl border border-[var(--border)] bg-white p-1 shadow-sm"
      aria-label="Период отчёта"
    >
      {periods.map((period) => {
        const selected = active === period.key;
        return (
          <Button
            key={period.key}
            type="button"
            variant={selected ? "default" : "ghost"}
            className={[
              "h-10 min-h-10 shrink-0 rounded-lg px-2 sm:px-4",
              selected
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-secondary)]",
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
          </Button>
        );
      })}
    </div>
  );
}
