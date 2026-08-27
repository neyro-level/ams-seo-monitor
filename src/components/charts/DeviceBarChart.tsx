"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatInteger, formatPercent } from "../../shared/format/metrics";

function toDisplayNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

type DeviceBarChartProps = {
  data: Array<{
    device: string;
    visits: number;
    conversionRate: number | null;
  }>;
};

export function DeviceBarChart({ data }: DeviceBarChartProps) {
  return (
    <div className="rounded-[8px] border border-[var(--report-border)] bg-white p-4 sm:p-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold leading-6 text-[var(--report-text)]">Устройства</h3>
        <p className="text-sm leading-5 text-[var(--report-text-secondary)]">
          Synthetic split нужен для проверки layout, local overflow и text fallback.
        </p>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="#E3E3E1" />
            <XAxis dataKey="device" axisLine={false} tickLine={false} tick={{ fill: "#827F81", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#827F81", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E3E3E1",
                boxShadow: "0 12px 32px rgba(23,22,26,0.1)",
              }}
              formatter={(value) => [formatInteger(toDisplayNumber(value)), "Визиты"]}
            />
            <Bar dataKey="visits" fill="#17161A" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-4 grid gap-2 text-sm text-[var(--report-text-secondary)] sm:grid-cols-2">
        {data.map((item) => (
          <li key={item.device} className="rounded-[8px] border border-[var(--report-border)] bg-[var(--report-surface-muted)] px-3 py-2">
            <span className="font-semibold text-[var(--report-text)]">{item.device}</span>: {formatInteger(item.visits)} визитов, {formatPercent(item.conversionRate)} конверсия
          </li>
        ))}
      </ul>
    </div>
  );
}
