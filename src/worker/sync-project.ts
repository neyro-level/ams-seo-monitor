import {
  REPORT_PERIOD_KEYS,
  derivePeriodEndingOn,
  derivePreviousPeriod,
  type DatePeriod,
} from "../../collector/analytics/periods";
import {
  createLiveSiteCollectors,
  type SiteSourceCollectors,
} from "../../collector/orchestration/client-sync";
import {
  compileSiteReportSnapshot,
  type SafeSourceFailure,
} from "../../collector/orchestration/report-compiler";
import type { MetricaSiteAudit } from "../shared/schemas/metrica-source";
import type { TopvisorSiteData } from "../shared/schemas/rank-source";
import type { ReportPeriodKey, SiteReportSnapshot } from "../shared/schemas/report";
import type { WebmasterSiteData } from "../shared/schemas/webmaster-source";
import { MonitoringService } from "../application/services/monitoring-service";
import { SyncService } from "../application/services/sync-service";
import { PrismaMonitoringRepository } from "../infrastructure/database/repositories/prisma-monitoring-repository";
import { PrismaProjectRepository } from "../infrastructure/database/repositories/prisma-project-repository";
import { PrismaReportRepository } from "../infrastructure/database/repositories/prisma-report-repository";
import { PrismaSyncRepository } from "../infrastructure/database/repositories/prisma-sync-repository";

export interface SyncProjectToDatabaseArgs {
  projectSlug: string;
  env?: NodeJS.ProcessEnv;
  collectors?: SiteSourceCollectors;
  now?: () => string;
}

export interface SyncProjectPeriodResult {
  periodKey: ReportPeriodKey;
  freshness: SiteReportSnapshot["freshness"];
}

export interface SyncProjectSiteResult {
  siteSlug: string;
  status: "success" | "partial" | "failed";
  freshness: SiteReportSnapshot["freshness"];
  periods: SyncProjectPeriodResult[];
  safeErrorCodes: string[];
}

export interface SyncProjectToDatabaseResult {
  projectSlug: string;
  status: "success" | "partial" | "failed";
  sites: SyncProjectSiteResult[];
}

function toSafeFailure(error: unknown): SafeSourceFailure {
  if (error && typeof error === "object" && "code" in error) {
    const code = typeof error.code === "string" ? error.code : "UNKNOWN_SOURCE_ERROR";
    const status =
      "status" in error && typeof error.status === "number" ? error.status : null;
    return { code, status };
  }

  return {
    code: "UNKNOWN_SOURCE_ERROR",
    status: null,
  };
}

function rowsReceivedForWebmaster(data: WebmasterSiteData | null) {
  if (!data) {
    return null;
  }

  return data.queryCollections.reduce((count, collection) => count + collection.queries.length, 0);
}

function rowsReceivedForMetrica(data: MetricaSiteAudit | null) {
  if (!data) {
    return null;
  }

  return (
    data.yandexOrganic.byTime.length +
    data.yandexOrganic.landingPages.length +
    data.yandexOrganic.devices.length +
    data.goalsSummary.items.length
  );
}

function rowsReceivedForTopvisor(data: TopvisorSiteData | null) {
  if (!data) {
    return null;
  }

  return data.snapshots.reduce((count, snapshot) => count + snapshot.queries.length, 0);
}

function findBaselinePeriod(webmasterData: WebmasterSiteData | null) {
  if (!webmasterData) {
    return null;
  }

  return (
    webmasterData.queryCollections.find(
      (collection) =>
        collection.device === "ALL" &&
        collection.orderBy === "TOTAL_SHOWS" &&
        collection.dateTo !== null,
    ) ?? null
  );
}

function getSourceStatusForPeriod(
  snapshot: SiteReportSnapshot,
  provider: "YANDEX_WEBMASTER" | "YANDEX_METRIKA" | "TOPVISOR",
) {
  if (provider === "YANDEX_WEBMASTER") {
    return snapshot.sources.webmaster;
  }

  if (provider === "YANDEX_METRIKA") {
    return snapshot.sources.metrica;
  }

  return snapshot.sources.topvisor ?? {
    status: "not_configured",
    fetchedAt: snapshot.generatedAt,
    periodStart: null,
    periodEnd: null,
    timezone: "+00:00",
    note: null,
    safeErrorCode: null,
  };
}

export async function syncProjectToDatabase(
  args: SyncProjectToDatabaseArgs,
): Promise<SyncProjectToDatabaseResult> {
  const monitoringService = new MonitoringService(new PrismaMonitoringRepository());
  const projectRepository = new PrismaProjectRepository();
  const reportRepository = new PrismaReportRepository();
  const syncService = new SyncService(new PrismaSyncRepository());
  const now = args.now ?? (() => new Date().toISOString());
  const generatedAt = now();
  const projectContext = await monitoringService.getProjectContext(args.projectSlug);

  if (!projectContext) {
    throw new Error(`Unknown project slug: ${args.projectSlug}`);
  }

  const collectors = args.collectors ?? createLiveSiteCollectors(args.env);
  const syncRun = await syncService.createSyncRun({
    trigger: "manual",
    startedAt: generatedAt,
  });
  const siteResults: SyncProjectSiteResult[] = [];
  const projectSafeErrors = new Set<string>();

  for (const site of projectContext.client.sites.filter((item) => item.enabled)) {
    const siteRecord = await projectRepository.findSiteBySlugs(projectContext.client.clientSlug, site.siteSlug);
    if (!siteRecord) {
      throw new Error(`Seeded site is missing in PostgreSQL: ${projectContext.client.clientSlug}/${site.siteSlug}`);
    }

    const sourceRuns = {
      webmaster: site.webmaster.enabled
        ? await syncService.createSourceRun({
            syncRunId: syncRun.syncRunId,
            siteId: siteRecord.siteId,
            provider: "YANDEX_WEBMASTER",
            startedAt: generatedAt,
          })
        : null,
      metrica: site.metrica.enabled
        ? await syncService.createSourceRun({
            syncRunId: syncRun.syncRunId,
            siteId: siteRecord.siteId,
            provider: "YANDEX_METRIKA",
            startedAt: generatedAt,
          })
        : null,
      topvisor: site.topvisor.enabled
        ? await syncService.createSourceRun({
            syncRunId: syncRun.syncRunId,
            siteId: siteRecord.siteId,
            provider: "TOPVISOR",
            startedAt: generatedAt,
          })
        : null,
    };

    let baselineWebmaster: WebmasterSiteData | null = null;
    let webmasterFailure: SafeSourceFailure | null = null;

    if (site.webmaster.enabled) {
      try {
        baselineWebmaster = await collectors.webmaster(site, {
          queryLimit: 500,
          queryOrders: ["TOTAL_SHOWS", "TOTAL_CLICKS"],
          devices: ["ALL", "DESKTOP", "MOBILE"],
          includeTechnicalDetails: true,
        });
      } catch (error) {
        webmasterFailure = toSafeFailure(error);
      }
    }

    let rankingData: TopvisorSiteData | null = null;
    let topvisorFailure: SafeSourceFailure | null = null;

    const baselinePeriod = findBaselinePeriod(baselineWebmaster);
    const fallbackMonth = await reportRepository.findLatestReportSnapshot(siteRecord.siteId, "month");
    const periodEnd =
      baselinePeriod?.dateTo ??
      fallbackMonth?.payload.comparison?.currentPeriod.dateTo ??
      generatedAt.slice(0, 10);

    if (site.topvisor.enabled) {
      try {
        if (!collectors.topvisor) {
          throw new Error("Topvisor collector is unavailable");
        }
        const historyPeriod = derivePeriodEndingOn(periodEnd, "halfYear");
        rankingData = await collectors.topvisor(site, {
          dateFrom: historyPeriod.dateFrom,
          dateTo: historyPeriod.dateTo,
        });
      } catch (error) {
        topvisorFailure = toSafeFailure(error);
      }
    }

    const periodResults: SyncProjectPeriodResult[] = [];
    const siteSafeErrorCodes = new Set<string>();
    let latestSnapshotForStatus: SiteReportSnapshot | null = null;
    let latestMetricaData: MetricaSiteAudit | null = null;

    for (const periodKey of REPORT_PERIOD_KEYS) {
      const currentPeriod: DatePeriod = derivePeriodEndingOn(periodEnd, periodKey);
      const previousPeriod: DatePeriod = derivePreviousPeriod(currentPeriod);
      const previousSnapshot = await reportRepository.findLatestReportSnapshot(siteRecord.siteId, periodKey);
      let webmasterData: WebmasterSiteData | null = null;
      let metricaData: MetricaSiteAudit | null = null;
      let previousWebmasterData: WebmasterSiteData | null = null;
      let previousMetricaData: MetricaSiteAudit | null = null;
      let metricaFailure: SafeSourceFailure | null = null;

      if (site.webmaster.enabled) {
        try {
          webmasterData = await collectors.webmaster(site, {
            queryLimit: 500,
            queryOrders: ["TOTAL_SHOWS", "TOTAL_CLICKS"],
            devices: ["ALL"],
            historyDateFrom: currentPeriod.dateFrom,
            historyDateTo: currentPeriod.dateTo,
            queryDateFrom: currentPeriod.dateFrom,
            queryDateTo: currentPeriod.dateTo,
            includeTechnicalDetails: false,
          });
          if (baselineWebmaster) {
            webmasterData = {
              ...webmasterData,
              diagnostics: baselineWebmaster.diagnostics,
              sitemaps: baselineWebmaster.sitemaps,
              indexingHistory: baselineWebmaster.indexingHistory,
              sqiHistory: baselineWebmaster.sqiHistory,
              searchEventsHistory: baselineWebmaster.searchEventsHistory,
              brokenInternalLinksHistory: baselineWebmaster.brokenInternalLinksHistory,
              externalLinksHistory: baselineWebmaster.externalLinksHistory,
            };
          }
          previousWebmasterData = await collectors.webmaster(site, {
            queryLimit: 500,
            queryOrders: ["TOTAL_SHOWS", "TOTAL_CLICKS"],
            devices: ["ALL"],
            historyDateFrom: previousPeriod.dateFrom,
            historyDateTo: previousPeriod.dateTo,
            queryDateFrom: previousPeriod.dateFrom,
            queryDateTo: previousPeriod.dateTo,
            includeTechnicalDetails: false,
          });
        } catch (error) {
          webmasterFailure = toSafeFailure(error);
        }
      }

      if (site.metrica.enabled) {
        try {
          metricaData = await collectors.metrica(site, {
            date1: currentPeriod.dateFrom,
            date2: currentPeriod.dateTo,
            landingLimit: 10,
            includeDetails: true,
          });
          previousMetricaData = await collectors.metrica(site, {
            date1: previousPeriod.dateFrom,
            date2: previousPeriod.dateTo,
            landingLimit: 0,
            includeDetails: false,
          });
          latestMetricaData = metricaData;
        } catch (error) {
          metricaFailure = toSafeFailure(error);
        }
      }

      const trackedQuerySet =
        projectContext.trackedQuerySets.find((item) => item.siteSlug === site.siteSlug) ?? null;
      const snapshot = compileSiteReportSnapshot({
        clientSlug: projectContext.client.clientSlug,
        site,
        generatedAt,
        clusterProfile: projectContext.clusterProfile,
        webmasterData,
        metricaData,
        previousWebmasterData,
        previousMetricaData,
        webmasterFailure,
        metricaFailure,
        previous: previousSnapshot?.payload ?? null,
        periodKey,
        currentPeriod,
        previousPeriod,
        queryThresholds: projectContext.thresholds.queryOpportunity,
        trackedQuerySet,
        rankingData,
        topvisorFailure,
      });

      await syncService.storeReportSnapshot({
        siteId: siteRecord.siteId,
        periodKey,
        snapshot,
      });

      latestSnapshotForStatus = snapshot;
      periodResults.push({ periodKey, freshness: snapshot.freshness });

      for (const safeErrorCode of [
        webmasterFailure?.code,
        metricaFailure?.code,
        topvisorFailure?.code,
      ]) {
        if (safeErrorCode) {
          siteSafeErrorCodes.add(safeErrorCode);
          projectSafeErrors.add(safeErrorCode);
        }
      }
    }

    if (sourceRuns.webmaster && latestSnapshotForStatus) {
      const webmasterState = getSourceStatusForPeriod(latestSnapshotForStatus, "YANDEX_WEBMASTER");
      await syncService.finishSourceRun({
        sourceRunId: sourceRuns.webmaster.sourceRunId,
        status: webmasterState.status,
        finishedAt: generatedAt,
        durationMs: null,
        rowsReceived: rowsReceivedForWebmaster(baselineWebmaster),
        safeErrorCode: webmasterState.safeErrorCode,
        notes: webmasterState.note,
      });
    }

    if (sourceRuns.metrica && latestSnapshotForStatus) {
      const metricaState = getSourceStatusForPeriod(latestSnapshotForStatus, "YANDEX_METRIKA");
      await syncService.finishSourceRun({
        sourceRunId: sourceRuns.metrica.sourceRunId,
        status: metricaState.status,
        finishedAt: generatedAt,
        durationMs: null,
        rowsReceived: rowsReceivedForMetrica(latestMetricaData),
        safeErrorCode: metricaState.safeErrorCode,
        notes: metricaState.note,
      });
    }

    if (sourceRuns.topvisor && latestSnapshotForStatus) {
      const topvisorState = getSourceStatusForPeriod(latestSnapshotForStatus, "TOPVISOR");
      await syncService.finishSourceRun({
        sourceRunId: sourceRuns.topvisor.sourceRunId,
        status: topvisorState.status,
        finishedAt: generatedAt,
        durationMs: null,
        rowsReceived: rowsReceivedForTopvisor(rankingData),
        safeErrorCode: topvisorState.safeErrorCode,
        notes: topvisorState.note,
      });
    }

    const failed = periodResults.every((period) => period.freshness === "unavailable");
    const partial = periodResults.some((period) => period.freshness !== "fresh");
    siteResults.push({
      siteSlug: site.siteSlug,
      status: failed ? "failed" : partial ? "partial" : "success",
      freshness: failed ? "unavailable" : partial ? "partial" : "fresh",
      periods: periodResults,
      safeErrorCodes: [...siteSafeErrorCodes],
    });
  }

  const finalStatus = siteResults.some((site) => site.status === "failed")
    ? "failed"
    : siteResults.some((site) => site.status === "partial")
      ? "partial"
      : "success";

  await syncService.finishSyncRun({
    syncRunId: syncRun.syncRunId,
    status: finalStatus,
    finishedAt: generatedAt,
    sitesProcessed: siteResults.length,
    safeError: [...projectSafeErrors][0] ?? null,
  });

  return {
    projectSlug: projectContext.client.clientSlug,
    status: finalStatus,
    sites: siteResults,
  };
}
