"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PageHeader } from "../../components/dashboard/PageHeader";
import { ReportPeriodSelector } from "../../components/dashboard/ReportPeriodSelector";
import { StatePanel } from "../../components/states/StatePanel";
import {
  reportPeriodKeySchema,
  siteReportSnapshotSchema,
  type ReportPeriodKey,
  type SiteReportSnapshot,
} from "../../shared/schemas/report";
import type { SiteRegistry } from "../../shared/schemas/registry";
import { SiteReportView } from "../dashboards/SiteReportView";

const reportDataBaseUrl = (
  process.env.NEXT_PUBLIC_REPORT_DATA_BASE_URL ?? ""
).replace(/\/$/, "");

type LiveSiteReportProps = {
  clientName: string;
  clientSlug: string;
  site: SiteRegistry;
  backHref: string;
};

function readPeriodFromLocation(): ReportPeriodKey {
  const requested = new URLSearchParams(window.location.search).get("period");
  const parsed = reportPeriodKeySchema.safeParse(requested);
  return parsed.success ? parsed.data : "week";
}

function subscribeToPeriod(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

export function LiveSiteReport({
  clientName,
  clientSlug,
  site,
  backHref,
}: LiveSiteReportProps) {
  const activePeriod = useSyncExternalStore<ReportPeriodKey>(
    subscribeToPeriod,
    readPeriodFromLocation,
    () => "week",
  );
  const [reports, setReports] = useState<
    Partial<Record<ReportPeriodKey, SiteReportSnapshot>>
  >({});
  const [failedPeriods, setFailedPeriods] = useState<
    Partial<Record<ReportPeriodKey, boolean>>
  >({});
  const snapshot = reports[activePeriod] ?? null;
  const failed = failedPeriods[activePeriod] ?? false;
  const dataPath = `/c/${clientSlug}/data/${site.siteSlug}/${activePeriod}/latest.json`;
  const dataUrl = `${reportDataBaseUrl}${dataPath}`;

  useEffect(() => {
    if (reports[activePeriod]) return;
    const controller = new AbortController();

    fetch(dataUrl, {
      cache: "no-store",
      credentials: reportDataBaseUrl ? "omit" : "same-origin",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Report request failed with HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        const report = siteReportSnapshotSchema.parse(payload);
        setReports((current) => ({ ...current, [activePeriod]: report }));
        setFailedPeriods((current) => ({ ...current, [activePeriod]: false }));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFailedPeriods((current) => ({ ...current, [activePeriod]: true }));
      });

    return () => controller.abort();
  }, [activePeriod, dataUrl, reports]);

  const periodControl = (
    <ReportPeriodSelector
      active={activePeriod}
      onChange={(period) => {
        const url = new URL(window.location.href);
        url.searchParams.set("period", period);
        window.history.replaceState(null, "", url);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
    />
  );

  if (snapshot) {
    return (
      <SiteReportView
        clientName={clientName}
        site={site}
        snapshot={snapshot}
        mode="live"
        backHref={backHref}
        periodControl={periodControl}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={clientName}
        title={site.name}
        description="Отчёт загружается из защищённого snapshot-хранилища."
        actions={periodControl}
        backHref={backHref}
      />
      <StatePanel
        state={failed ? "error" : "stale"}
        title={failed ? "Отчёт временно недоступен" : "Загружаем отчёт"}
        description={
          failed
            ? "Последний опубликованный отчёт не удалось получить. Обновите страницу или повторите позже."
            : "Проверяем актуальность данных Яндекс.Вебмастера и Яндекс.Метрики."
        }
      />
    </div>
  );
}
