"use client";

import { useState } from "react";
import { formatInteger, formatPercent, formatPosition } from "../../shared/format/metrics";
import type { TrackedCoreReport } from "../../shared/schemas/report";
import { DataTable } from "./DataTable";

type TrackedQueryTableProps = {
  core: TrackedCoreReport;
};

function deltaLabel(value: number | null, suffix: string) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}${suffix}`;
}

export function TrackedQueryTable({ core }: TrackedQueryTableProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleQueries = expanded ? core.queries : core.queries.slice(0, 20);

  return (
    <div className="space-y-4">
      <DataTable
        caption={`Отслеживаемое поисковое ядро: ${core.expectedCount} запросов`}
        columns={["Запрос", "Показы", "Клики", "CTR", "Позиция", "Δ позиции", "Статус"]}
        rows={visibleQueries.map((query) => ({
          key: query.query,
          cells: [
            <div key="query" className="min-w-[260px]">
              <p className="font-semibold text-[var(--crm-text)]">{query.query}</p>
              <p className="mt-1 text-xs text-[var(--crm-text-muted)]">{query.cluster}</p>
            </div>,
            <span key="shows" className="tabular-nums">{formatInteger(query.shows)}</span>,
            <div key="clicks" className="tabular-nums">
              <p>{formatInteger(query.clicks)}</p>
              <p className="text-xs text-[var(--crm-text-muted)]">{deltaLabel(query.deltaClicksPercent, "%")}</p>
            </div>,
            <div key="ctr" className="tabular-nums">
              <p>{formatPercent(query.ctr, 2)}</p>
              <p className="text-xs text-[var(--crm-text-muted)]">{deltaLabel(query.deltaCtrPoints, " п.п.")}</p>
            </div>,
            <span key="position" className="tabular-nums">{formatPosition(query.avgShowPosition)}</span>,
            <span key="delta-position" className="tabular-nums">{deltaLabel(query.deltaPosition, "")}</span>,
            <span key="status" className={query.observedInWebmaster ? "text-emerald-700" : "text-amber-700"}>
              {query.observedInWebmaster ? query.opportunityType : "Нет в пуле Вебмастера"}
            </span>,
          ],
        }))}
      />
      {core.queries.length > 20 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex min-h-10 items-center rounded-lg border border-[var(--crm-border)] bg-white px-4 text-sm font-semibold text-[var(--crm-text)] transition hover:border-[var(--crm-primary)] hover:text-[var(--crm-primary)]"
        >
          {expanded ? "Показать первые 20" : `Показать все ${core.expectedCount}`}
        </button>
      ) : null}
    </div>
  );
}
