"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatInteger, formatPercent } from "../../shared/format/metrics.ts";
import { ChartContainer, ChartTooltip } from "../ui/chart.tsx";

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
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold leading-6 text-[var(--foreground)]">Устройства</h3>
        <p className="text-sm leading-5 text-[var(--text-secondary)]">
          Synthetic split нужен для проверки layout, local overflow и text fallback.
        </p>
      </div>
      <ChartContainer className="h-[280px]" config={{ visits: { label: "Визиты", color: "#101720" } }}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="#E3E3E1" />
            <XAxis dataKey="device" axisLine={false} tickLine={false} tick={{ fill: "#827F81", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#827F81", fontSize: 11 }} />
            <ChartTooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E3E3E1",
                boxShadow: "0 12px 32px rgba(23,22,26,0.1)",
              }}
              formatter={(value) => [formatInteger(toDisplayNumber(value)), "Визиты"]}
            />
            <Bar dataKey="visits" fill="var(--color-visits)" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
      </ChartContainer>
      <ul className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
        {data.map((item) => (
          <li key={item.device} className="rounded-[8px] border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
            <span className="font-semibold text-[var(--foreground)]">{item.device}</span>: {formatInteger(item.visits)} визитов, {formatPercent(item.conversionRate)} конверсия
          </li>
        ))}
      </ul>
    </div>
  );
}
