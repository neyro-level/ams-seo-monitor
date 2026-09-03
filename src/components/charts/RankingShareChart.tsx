"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrackedRankingReport } from "../../shared/schemas/report.ts";

type RankingShareChartProps = {
  ranking: TrackedRankingReport;
};

export function RankingShareChart({ ranking }: RankingShareChartProps) {
  if (ranking.history.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--crm-border)] bg-white p-5">
        <h3 className="text-lg font-semibold text-[var(--crm-text)]">Динамика Топ-3 и Топ-10</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--crm-text-secondary)]">
          История начнёт формироваться после второго read-only съёма позиций Topvisor. Исходный снимок уже используется в текущих KPI.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-white p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--crm-text)]">Доля запросов в Топ-3 и Топ-10</h3>
        <p className="mt-1 text-sm text-[var(--crm-text-secondary)]">
          Реальные даты съёмов позиций. Знаменатель — утверждённое ядро из {ranking.queryCount} запросов.
        </p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ranking.history}>
            <CartesianGrid vertical={false} stroke="#E3E3E1" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#827F81", fontSize: 11 }} />
            <YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} tick={{ fill: "#827F81", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E3E3E1",
                boxShadow: "0 12px 32px rgba(23,22,26,0.1)",
              }}
              formatter={(value, name, item) => {
                const payload = item.payload as TrackedRankingReport["history"][number];
                if (name === "top3Share") {
                  return [`${Number(value).toFixed(1)}% · ${payload.top3Count} из ${ranking.queryCount}`, "Топ-3"];
                }
                return [`${Number(value).toFixed(1)}% · ${payload.top10Count} из ${ranking.queryCount}`, "Топ-10"];
              }}
            />
            <Line type="monotone" dataKey="top10Share" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="top3Share" stroke="#D97706" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-5 text-sm text-[var(--crm-text-secondary)]">
        <span><span className="mr-2 inline-block size-2.5 rounded-full bg-blue-600" />Топ-10</span>
        <span><span className="mr-2 inline-block size-2.5 rounded-full bg-amber-600" />Топ-3</span>
      </div>
    </div>
  );
}
