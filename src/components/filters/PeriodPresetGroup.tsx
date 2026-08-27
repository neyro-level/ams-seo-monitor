const presets = ["7 дней", "28 дней", "Квартал", "Год"];

type PeriodPresetGroupProps = {
  active?: string;
};

export function PeriodPresetGroup({ active = "28 дней" }: PeriodPresetGroupProps) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-xl border border-[var(--report-border)] bg-white p-1">
        {presets.map((preset) => {
          const isActive = preset === active;
          return (
            <button
              key={preset}
              type="button"
              className={[
                "min-h-10 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                isActive
                  ? "bg-[var(--report-sidebar)] text-white"
                  : "bg-transparent text-[var(--report-text-secondary)] hover:bg-[var(--report-surface-muted)]",
              ].join(" ")}
              aria-pressed={isActive}
            >
              {preset}
            </button>
          );
        })}
      </div>
    </div>
  );
}
