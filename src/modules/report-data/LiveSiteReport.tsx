"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "../../components/dashboard/PageHeader";
import { StatePanel } from "../../components/states/StatePanel";
import { SiteReportView } from "../dashboards/SiteReportView";
import { siteReportSnapshotSchema, type SiteReportSnapshot } from "../../shared/schemas/report";
import type { SiteRegistry } from "../../shared/schemas/registry";

type LiveSiteReportProps = {
  clientName: string;
  clientSlug: string;
  site: SiteRegistry;
  backHref: string;
};

export function LiveSiteReport({
  clientName,
  clientSlug,
  site,
  backHref,
}: LiveSiteReportProps) {
  const [snapshot, setSnapshot] = useState<SiteReportSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const dataUrl = `/c/${clientSlug}/data/${site.siteSlug}/latest.json`;

  useEffect(() => {
    const controller = new AbortController();

    fetch(dataUrl, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Report request failed with HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        setSnapshot(siteReportSnapshotSchema.parse(payload));
        setFailed(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFailed(true);
      });

    return () => controller.abort();
  }, [dataUrl]);

  if (snapshot) {
    return (
      <SiteReportView
        clientName={clientName}
        site={site}
        snapshot={snapshot}
        mode="live"
        backHref={backHref}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={clientName}
        title={site.name}
        description="Отчёт загружается из защищённого snapshot-хранилища."
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
