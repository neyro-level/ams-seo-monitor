const presets = ["7 дней", "28 дней", "Квартал", "Год"];

type PeriodPresetGroupProps = {
  active?: string;
};

export function PeriodPresetGroup({ active = "28 дней" }: PeriodPresetGroupProps) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1 rounded-xl border border-[var(--crm-border)] bg-white p-1 shadow-sm">
        {presets.map((preset) => {
          const isActive = preset === active;
          return (
            <button
              key={preset}
              type="button"
              className={[
                "min-h-10 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-[var(--crm-primary)] text-white"
                  : "bg-transparent text-[var(--crm-text-secondary)] hover:bg-[var(--crm-surface-muted)]",
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
