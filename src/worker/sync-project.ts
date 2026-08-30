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

function normalizeTrackedQuery(value: string) {
  return value.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();
}

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function buildWebmasterDailyRows(data: WebmasterSiteData | null) {
  if (!data) {
    return [];
  }

  const pointsByIndicator = {
    TOTAL_SHOWS: data.allQueryHistory.find((history) => history.indicator === "TOTAL_SHOWS")?.points ?? [],
    TOTAL_CLICKS: data.allQueryHistory.find((history) => history.indicator === "TOTAL_CLICKS")?.points ?? [],
    AVG_SHOW_POSITION:
      data.allQueryHistory.find((history) => history.indicator === "AVG_SHOW_POSITION")?.points ?? [],
  };
  const allDates = new Set<string>();
  for (const point of pointsByIndicator.TOTAL_SHOWS) allDates.add(toDateOnly(point.date));
  for (const point of pointsByIndicator.TOTAL_CLICKS) allDates.add(toDateOnly(point.date));
  for (const point of pointsByIndicator.AVG_SHOW_POSITION) allDates.add(toDateOnly(point.date));
  const clicksByDate = new Map(pointsByIndicator.TOTAL_CLICKS.map((point) => [toDateOnly(point.date), point.value]));
  const positionByDate = new Map(
    pointsByIndicator.AVG_SHOW_POSITION.map((point) => [toDateOnly(point.date), point.value]),
  );

  return [...allDates]
    .sort()
    .map((date) => {
      const showsPoint = pointsByIndicator.TOTAL_SHOWS.find((point) => toDateOnly(point.date) === date);
      const shows = showsPoint?.value ?? 0;
      const clicks = clicksByDate.get(date) ?? 0;
      return {
        date,
        shows,
        clicks,
        ctr: shows > 0 ? Number(((clicks / shows) * 100).toFixed(2)) : null,
        averagePosition: positionByDate.get(date) ?? null,
      };
    });
}

function buildWebmasterQueryRows(
  data: WebmasterSiteData | null,
  periodKey: ReportPeriodKey,
  fallbackDate: string,
) {
  if (!data) {
    return [];
  }

  return data.queryCollections.flatMap((collection) =>
    collection.queries.map((query) => ({
      date: collection.dateTo ?? fallbackDate,
      queryId: query.queryId,
      query: query.queryText,
      normalizedQuery: normalizeTrackedQuery(query.queryText),
      orderBy: collection.orderBy,
      device: query.device,
      shows: query.shows,
      clicks: query.clicks,
      ctr: query.ctrPercent,
      averagePosition: query.avgShowPosition,
      averageClickPosition: query.avgClickPosition,
      periodKey,
    })),
  );
}

function buildMetrikaDailyRows(data: MetricaSiteAudit | null) {
  if (!data) {
    return [];
  }

  return data.yandexOrganic.byTime.map((point) => ({
    date: point.date,
    visits: point.visits,
    users: null,
    pageviews: null,
    bounceRate: null,
    pageDepth: null,
    averageVisitDurationSeconds: null,
    goalReaches: point.goalReaches,
    uniqueTargetVisits: point.targetVisits,
    uniqueTargetUsers: null,
    allVisits: null,
    conversionRate: point.conversionRate,
  }));
}

function buildLandingPageRows(
  data: MetricaSiteAudit | null,
  periodKey: ReportPeriodKey,
  fallbackDate: string,
) {
  if (!data) {
    return [];
  }

  const date = data.yandexOrganic.meta.date2 ?? fallbackDate;
  return data.yandexOrganic.landingPages.map((row) => ({
    date,
    periodKey,
    path: row.path,
    visits: row.visits,
    users: row.users,
    pageviews: row.pageviews,
    bounceRate: row.bounceRate,
    pageDepth: row.pageDepth,
    averageVisitDurationSeconds: row.averageVisitDurationSeconds,
    goalReaches: row.goalReaches,
    targetVisits: row.targetVisits,
    conversionRate: row.conversionRate,
  }));
}

function buildMetrikaDeviceRows(
  data: MetricaSiteAudit | null,
  periodKey: ReportPeriodKey,
  fallbackDate: string,
) {
  if (!data) {
    return [];
  }

  const date = data.yandexOrganic.meta.date2 ?? fallbackDate;
  return data.yandexOrganic.devices.map((row) => ({
    date,
    periodKey,
    device: row.device,
    visits: row.visits,
    users: row.users,
    goalReaches: row.goalReaches,
    conversionRate: row.conversionRate,
  }));
}

function buildMetrikaGoalRows(
  data: MetricaSiteAudit | null,
  periodKey: ReportPeriodKey,
  fallbackDate: string,
) {
  if (!data) {
    return [];
  }

  const date = data.goalsSummary.meta.date2 ?? data.yandexOrganic.meta.date2 ?? fallbackDate;
  return data.goalsSummary.items.map((row) => ({
    date,
    periodKey,
    externalGoalId: row.goalId,
    name: row.name,
    category: row.category.toUpperCase().replace(/-/g, "_") as
      | "LEAD_SUBMIT"
      | "PHONE_CLICK"
      | "MESSENGER_CLICK"
      | "FORM_START"
      | "FILE_DOWNLOAD"
      | "OTHER",
    direction: row.direction.toUpperCase() as "PRIMARY" | "SECONDARY",
    reaches: row.reaches,
    visits: row.visits,
    users: row.users,
    conversionRate: row.conversionRate,
  }));
}

function buildTechnicalSnapshotRows(
  webmasterData: WebmasterSiteData | null,
  metricaData: MetricaSiteAudit | null,
) {
  const rows: Array<{
    capturedAt: string;
    kind:
      | "WEBMASTER_DIAGNOSTICS"
      | "WEBMASTER_SITEMAPS"
      | "WEBMASTER_INDEXING_HISTORY"
      | "WEBMASTER_SEARCH_EVENTS_HISTORY"
      | "WEBMASTER_BROKEN_INTERNAL_LINKS_HISTORY"
      | "WEBMASTER_EXTERNAL_LINKS_HISTORY"
      | "WEBMASTER_PAGES_IN_SEARCH_HISTORY"
      | "WEBMASTER_SQI_HISTORY"
      | "METRICA_ALL_TRAFFIC_META"
      | "METRICA_YANDEX_ORGANIC_META"
      | "METRICA_GOALS_SUMMARY_META";
    payload: unknown;
  }> = [];

  if (webmasterData) {
    rows.push(
      { capturedAt: webmasterData.fetchedAt, kind: "WEBMASTER_DIAGNOSTICS", payload: webmasterData.diagnostics },
      { capturedAt: webmasterData.fetchedAt, kind: "WEBMASTER_SITEMAPS", payload: webmasterData.sitemaps },
      { capturedAt: webmasterData.fetchedAt, kind: "WEBMASTER_INDEXING_HISTORY", payload: webmasterData.indexingHistory },
      { capturedAt: webmasterData.fetchedAt, kind: "WEBMASTER_SEARCH_EVENTS_HISTORY", payload: webmasterData.searchEventsHistory },
      { capturedAt: webmasterData.fetchedAt, kind: "WEBMASTER_BROKEN_INTERNAL_LINKS_HISTORY", payload: webmasterData.brokenInternalLinksHistory },
      { capturedAt: webmasterData.fetchedAt, kind: "WEBMASTER_EXTERNAL_LINKS_HISTORY", payload: webmasterData.externalLinksHistory },
      { capturedAt: webmasterData.fetchedAt, kind: "WEBMASTER_PAGES_IN_SEARCH_HISTORY", payload: webmasterData.pagesInSearchHistory },
      { capturedAt: webmasterData.fetchedAt, kind: "WEBMASTER_SQI_HISTORY", payload: webmasterData.sqiHistory },
    );
  }

  if (metricaData) {
    rows.push(
      { capturedAt: metricaData.fetchedAt, kind: "METRICA_ALL_TRAFFIC_META", payload: metricaData.allTraffic.meta },
      { capturedAt: metricaData.fetchedAt, kind: "METRICA_YANDEX_ORGANIC_META", payload: metricaData.yandexOrganic.meta },
      { capturedAt: metricaData.fetchedAt, kind: "METRICA_GOALS_SUMMARY_META", payload: metricaData.goalsSummary.meta },
    );
  }

  return rows;
}

function buildRankingCaptureRows(
  rankingData: TopvisorSiteData | null,
  trackedQueryRows: Array<{ trackedQueryId: string; normalizedQuery: string }>,
) {
  if (!rankingData) {
    return [];
  }

  const trackedQueryIdByNormalizedQuery = new Map(
    trackedQueryRows.map((row) => [row.normalizedQuery, row.trackedQueryId]),
  );

  return rankingData.snapshots.flatMap((snapshot) =>
    snapshot.queries.flatMap((query) => {
      const trackedQueryId = trackedQueryIdByNormalizedQuery.get(normalizeTrackedQuery(query.query));
      if (!trackedQueryId) {
        return [];
      }

      return [
        {
          trackedQueryId,
          capturedAt: `${snapshot.capturedAt}T00:00:00.000Z`,
          position: query.position,
          source: "TOPVISOR" as const,
        },
      ];
    }),
  );
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
    let preferredTechnicalMetricaData: MetricaSiteAudit | null = null;

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

      if (sourceRuns.webmaster) {
        await syncService.storeWebmasterDailyMetrics({
          siteId: siteRecord.siteId,
          sourceRunId: sourceRuns.webmaster.sourceRunId,
          rows: buildWebmasterDailyRows(webmasterData),
        });
        await syncService.storeWebmasterDailyMetrics({
          siteId: siteRecord.siteId,
          sourceRunId: sourceRuns.webmaster.sourceRunId,
          rows: buildWebmasterDailyRows(previousWebmasterData),
        });
        await syncService.storeWebmasterQueryMetrics({
          siteId: siteRecord.siteId,
          sourceRunId: sourceRuns.webmaster.sourceRunId,
          periodKey,
          rows: buildWebmasterQueryRows(webmasterData, periodKey, currentPeriod.dateTo),
        });
        await syncService.storeWebmasterQueryMetrics({
          siteId: siteRecord.siteId,
          sourceRunId: sourceRuns.webmaster.sourceRunId,
          periodKey,
          rows: buildWebmasterQueryRows(previousWebmasterData, periodKey, previousPeriod.dateTo),
        });
      }

      if (sourceRuns.metrica) {
        await syncService.storeMetrikaDailyMetrics({
          siteId: siteRecord.siteId,
          sourceRunId: sourceRuns.metrica.sourceRunId,
          rows: buildMetrikaDailyRows(metricaData),
        });
        await syncService.storeMetrikaDailyMetrics({
          siteId: siteRecord.siteId,
          sourceRunId: sourceRuns.metrica.sourceRunId,
          rows: buildMetrikaDailyRows(previousMetricaData),
        });
        await syncService.storeLandingPageMetrics({
          siteId: siteRecord.siteId,
          sourceRunId: sourceRuns.metrica.sourceRunId,
          periodKey,
          rows: buildLandingPageRows(metricaData, periodKey, currentPeriod.dateTo),
        });
        await syncService.storeMetrikaDeviceMetrics({
          siteId: siteRecord.siteId,
          sourceRunId: sourceRuns.metrica.sourceRunId,
          periodKey,
          rows: buildMetrikaDeviceRows(metricaData, periodKey, currentPeriod.dateTo),
        });
        await syncService.storeMetrikaGoalMetrics({
          siteId: siteRecord.siteId,
          sourceRunId: sourceRuns.metrica.sourceRunId,
          periodKey,
          rows: buildMetrikaGoalRows(metricaData, periodKey, currentPeriod.dateTo),
        });
      }

      if (periodKey === "month" && metricaData) {
        preferredTechnicalMetricaData = metricaData;
      }

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

    if (sourceRuns.webmaster && baselineWebmaster) {
      await syncService.storeTechnicalSnapshots({
        siteId: siteRecord.siteId,
        sourceRunId: sourceRuns.webmaster.sourceRunId,
        rows: buildTechnicalSnapshotRows(baselineWebmaster, null).filter((row) =>
          row.kind.startsWith("WEBMASTER_"),
        ),
      });
    }

    if (sourceRuns.metrica && preferredTechnicalMetricaData) {
      await syncService.storeTechnicalSnapshots({
        siteId: siteRecord.siteId,
        sourceRunId: sourceRuns.metrica.sourceRunId,
        rows: buildTechnicalSnapshotRows(null, preferredTechnicalMetricaData).filter((row) =>
          row.kind.startsWith("METRICA_"),
        ),
      });
    }

    if (sourceRuns.topvisor && rankingData) {
      const trackedQuerySet = await syncService.listTrackedQueriesForSite(siteRecord.siteId);
      await syncService.storeRankingCaptures({
        sourceRunId: sourceRuns.topvisor.sourceRunId,
        rows: buildRankingCaptureRows(rankingData, trackedQuerySet.rows),
      });
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
