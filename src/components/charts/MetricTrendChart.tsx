"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInteger, formatPosition } from "../../shared/format/metrics";
import type { TrendPoint } from "../../shared/schemas/report";

function toDisplayNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

type MetricTrendChartProps = {
  title: string;
  subtitle: string;
  data: TrendPoint[];
  metricLabel: string;
  secondaryMetricLabel?: string;
  tertiaryMetricLabel?: string;
};

export function MetricTrendChart({
  title,
  subtitle,
  data,
  metricLabel,
  secondaryMetricLabel,
  tertiaryMetricLabel,
}: MetricTrendChartProps) {
  const gradientId = useId();

  return (
    <div className="rounded-[8px] border border-[var(--report-border)] bg-white p-4 sm:p-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold leading-6 text-[var(--report-text)]">{title}</h3>
        <p className="text-sm leading-5 text-[var(--report-text-secondary)]">{subtitle}</p>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8A1515" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#8A1515" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E3E3E1" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#827F81", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#827F81", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E3E3E1",
                boxShadow: "0 12px 32px rgba(23,22,26,0.1)",
              }}
              labelStyle={{ color: "#827F81", fontSize: 12 }}
              formatter={(value) => [formatInteger(toDisplayNumber(value)), metricLabel]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8A1515"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-[var(--report-text-secondary)] sm:grid-cols-3">
        <p>
          {metricLabel}: {formatInteger(data.at(-1)?.value)}
        </p>
        {secondaryMetricLabel ? (
          <p>
            {secondaryMetricLabel}: {formatInteger(data.at(-1)?.secondaryValue ?? null)}
          </p>
        ) : null}
        {tertiaryMetricLabel ? (
          <p>
            {tertiaryMetricLabel}: {formatPosition(data.at(-1)?.tertiaryValue ?? null)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
