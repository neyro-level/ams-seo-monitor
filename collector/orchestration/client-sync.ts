import type { MetricaSiteAudit } from "../../src/shared/schemas/metrica-source";
import type {
  ClientRegistry,
  ClusterProfile,
  SiteRegistry,
} from "../../src/shared/schemas/registry";
import type { ReportPeriodKey } from "../../src/shared/schemas/report";
import type { WebmasterSiteData } from "../../src/shared/schemas/webmaster-source";
import type { TrackedQuerySet } from "../../src/shared/schemas/tracked-query";
import {
  derivePeriodEndingOn,
  derivePreviousPeriod,
  REPORT_PERIOD_KEYS,
  type DatePeriod,
} from "../analytics/periods";
import {
  publishSiteSnapshot,
  readLatestSiteSnapshot,
} from "../storage/snapshots";
import { publishSiteSourceBundle } from "../storage/source-bundles";
import {
  createMetricaClient,
  readMetricaEnvironment,
} from "../sources/yandex-metrica/client";
import { MetricaSafeError } from "../sources/yandex-metrica/http";
import {
  createWebmasterClient,
  readWebmasterEnvironment,
} from "../sources/yandex-webmaster/client";
import { WebmasterSafeError } from "../sources/yandex-webmaster/http";
import { loadCollectorRegistry } from "./metrica-site-config";
import {
  compileSiteReportSnapshot,
  type SafeSourceFailure,
} from "./report-compiler";

type WebmasterCollectOptions = {
  queryLimit?: number;
  queryOrders?: Array<"TOTAL_SHOWS" | "TOTAL_CLICKS">;
  devices?: Array<"ALL" | "DESKTOP" | "MOBILE">;
  historyDateFrom?: string;
  historyDateTo?: string;
  queryDateFrom?: string;
  queryDateTo?: string;
  includeTechnicalDetails?: boolean;
};

type MetricaCollectOptions = {
  date1?: string;
  date2?: string;
  landingLimit?: number;
  includeDetails?: boolean;
};

export type SiteSourceCollectors = {
  webmaster: (
    site: SiteRegistry,
    options?: WebmasterCollectOptions,
  ) => Promise<WebmasterSiteData>;
  metrica: (
    site: SiteRegistry,
    options?: MetricaCollectOptions,
  ) => Promise<MetricaSiteAudit>;
};

export type SiteSyncResult = {
  clientSlug: string;
  siteSlug: string;
  status: "success" | "partial" | "failed";
  freshness: "fresh" | "stale" | "partial" | "unavailable";
  latestPath: string;
  safeErrorCodes: string[];
  periods: Array<{
    periodKey: ReportPeriodKey;
    freshness: "fresh" | "stale" | "partial" | "unavailable";
    reportPath: string;
  }>;
};

function safeFailure(error: unknown): SafeSourceFailure {
  if (error instanceof WebmasterSafeError || error instanceof MetricaSafeError) {
    return {
      code: error.code,
      status: error.status,
    };
  }

  return {
    code: "UNKNOWN_SOURCE_ERROR",
    status: null,
  };
}

export function createLiveSiteCollectors(
  env: NodeJS.ProcessEnv = process.env,
): SiteSourceCollectors {
  const webmasterCollectors = new Map<
    string,
    SiteSourceCollectors["webmaster"]
  >();
  const metricaCollectors = new Map<string, SiteSourceCollectors["metrica"]>();

  return {
    async webmaster(site, options) {
      let collect = webmasterCollectors.get(site.siteSlug);
      if (!collect) {
        const config = readWebmasterEnvironment({
          ...env,
          YANDEX_WEBMASTER_SITE_URL: site.siteUrl,
        });
        const client = createWebmasterClient(config);
        collect = (_site, collectOptions) =>
          client.collectSiteData(collectOptions);
        webmasterCollectors.set(site.siteSlug, collect);
      }
      return collect(site, options);
    },
    async metrica(site, options) {
      let collect = metricaCollectors.get(site.siteSlug);
      if (!collect) {
        const config = readMetricaEnvironment({
          ...env,
          YANDEX_METRICA_SITE_URL: site.siteUrl,
        });
        const client = createMetricaClient(config);
        collect = (_site, collectOptions) =>
          client.collectSiteData(collectOptions);
        metricaCollectors.set(site.siteSlug, collect);
      }
      return collect(site, options);
    },
  };
}

async function collectPeriod(args: {
  client: ClientRegistry;
  site: SiteRegistry;
  sharedDir: string;
  collectors: SiteSourceCollectors;
  generatedAt: string;
  periodKey: ReportPeriodKey;
  currentPeriod: DatePeriod;
  previousPeriod: DatePeriod;
  baselineWebmaster: WebmasterSiteData | null;
  baselineFailure: SafeSourceFailure | null;
  clusterProfile: ClusterProfile;
  trackedQuerySet: TrackedQuerySet | null;
  thresholds: {
    minimumShows: number;
    maximumCtrPercent: number;
    maximumAveragePosition: number;
  };
}) {
  const previousSnapshot = await readLatestSiteSnapshot(
    args.sharedDir,
    args.client.clientSlug,
    args.site.siteSlug,
    args.periodKey,
  );
  let webmasterData: WebmasterSiteData | null = null;
  let metricaData: MetricaSiteAudit | null = null;
  let previousWebmasterData: WebmasterSiteData | null = null;
  let previousMetricaData: MetricaSiteAudit | null = null;
  let webmasterFailure = args.baselineFailure;
  let metricaFailure: SafeSourceFailure | null = null;

  if (args.site.webmaster.enabled) {
    try {
      webmasterData = await args.collectors.webmaster(args.site, {
        queryLimit: 500,
        queryOrders: ["TOTAL_SHOWS", "TOTAL_CLICKS"],
        devices: ["ALL"],
        historyDateFrom: args.currentPeriod.dateFrom,
        historyDateTo: args.currentPeriod.dateTo,
        queryDateFrom: args.currentPeriod.dateFrom,
        queryDateTo: args.currentPeriod.dateTo,
        includeTechnicalDetails: false,
      });
      if (args.baselineWebmaster) {
        webmasterData = {
          ...webmasterData,
          diagnostics: args.baselineWebmaster.diagnostics,
          sitemaps: args.baselineWebmaster.sitemaps,
          indexingHistory: args.baselineWebmaster.indexingHistory,
          sqiHistory: args.baselineWebmaster.sqiHistory,
          searchEventsHistory: args.baselineWebmaster.searchEventsHistory,
          brokenInternalLinksHistory:
            args.baselineWebmaster.brokenInternalLinksHistory,
          externalLinksHistory: args.baselineWebmaster.externalLinksHistory,
        };
      }
      previousWebmasterData = await args.collectors.webmaster(args.site, {
        queryLimit: 500,
        queryOrders: ["TOTAL_SHOWS", "TOTAL_CLICKS"],
        devices: ["ALL"],
        historyDateFrom: args.previousPeriod.dateFrom,
        historyDateTo: args.previousPeriod.dateTo,
        queryDateFrom: args.previousPeriod.dateFrom,
        queryDateTo: args.previousPeriod.dateTo,
        includeTechnicalDetails: false,
      });
    } catch (error) {
      webmasterFailure = safeFailure(error);
    }
  }

  if (args.site.metrica.enabled) {
    try {
      metricaData = await args.collectors.metrica(args.site, {
        date1: args.currentPeriod.dateFrom,
        date2: args.currentPeriod.dateTo,
        landingLimit: 10,
        includeDetails: true,
      });
      previousMetricaData = await args.collectors.metrica(args.site, {
        date1: args.previousPeriod.dateFrom,
        date2: args.previousPeriod.dateTo,
        landingLimit: 0,
        includeDetails: false,
      });
    } catch (error) {
      metricaFailure = safeFailure(error);
    }
  }

  await publishSiteSourceBundle({
    rootDir: args.sharedDir,
    bundle: {
      schemaVersion: 1,
      generatedAt: args.generatedAt,
      clientSlug: args.client.clientSlug,
      siteSlug: args.site.siteSlug,
      periodKey: args.periodKey,
      current: {
        webmaster: webmasterData,
        metrica: metricaData,
      },
      previous: {
        webmaster: previousWebmasterData,
        metrica: previousMetricaData,
      },
    },
  });

  const snapshot = compileSiteReportSnapshot({
    clientSlug: args.client.clientSlug,
    site: args.site,
    generatedAt: args.generatedAt,
    clusterProfile: args.clusterProfile,
    webmasterData,
    metricaData,
    previousWebmasterData,
    previousMetricaData,
    webmasterFailure,
    metricaFailure,
    previous: previousSnapshot,
    periodKey: args.periodKey,
    currentPeriod: args.currentPeriod,
    previousPeriod: args.previousPeriod,
    queryThresholds: args.thresholds,
    trackedQuerySet: args.trackedQuerySet,
  });
  const published = await publishSiteSnapshot({
    rootDir: args.sharedDir,
    snapshot,
    periodKey: args.periodKey,
  });

  return {
    snapshot,
    published,
    safeErrorCodes: [webmasterFailure?.code, metricaFailure?.code].filter(
      (code): code is string => Boolean(code),
    ),
  };
}

async function syncSite(args: {
  client: ClientRegistry;
  site: SiteRegistry;
  sharedDir: string;
  collectors: SiteSourceCollectors;
  generatedAt: string;
  clusterProfile: ClusterProfile;
  thresholds: {
    minimumShows: number;
    maximumCtrPercent: number;
    maximumAveragePosition: number;
  };
  trackedQuerySet: TrackedQuerySet | null;
}) {
  let baselineWebmaster: WebmasterSiteData | null = null;
  let baselineFailure: SafeSourceFailure | null = null;

  if (args.site.webmaster.enabled) {
    try {
      baselineWebmaster = await args.collectors.webmaster(args.site, {
        queryLimit: 500,
        queryOrders: ["TOTAL_SHOWS", "TOTAL_CLICKS"],
        devices: ["ALL", "DESKTOP", "MOBILE"],
        includeTechnicalDetails: true,
      });
    } catch (error) {
      baselineFailure = safeFailure(error);
    }
  }

  const baselinePeriod = baselineWebmaster?.queryCollections.find(
    (collection) =>
      collection.device === "ALL" &&
      collection.orderBy === "TOTAL_SHOWS" &&
      collection.dateTo !== null,
  );
  const fallbackTwoWeeks = await readLatestSiteSnapshot(
    args.sharedDir,
    args.client.clientSlug,
    args.site.siteSlug,
    "twoWeeks",
  );
  const periodEnd =
    baselinePeriod?.dateTo ??
    fallbackTwoWeeks?.comparison?.currentPeriod.dateTo ??
    args.generatedAt.slice(0, 10);
  const periods: SiteSyncResult["periods"] = [];
  const safeErrorCodes = new Set<string>();
  let defaultLatestPath = "";

  for (const periodKey of REPORT_PERIOD_KEYS) {
    const currentPeriod = derivePeriodEndingOn(periodEnd, periodKey);
    const previousPeriod = derivePreviousPeriod(currentPeriod);
    const result = await collectPeriod({
      ...args,
      periodKey,
      currentPeriod,
      previousPeriod,
      baselineWebmaster,
      baselineFailure,
      trackedQuerySet: args.trackedQuerySet,
    });

    for (const code of result.safeErrorCodes) safeErrorCodes.add(code);
    periods.push({
      periodKey,
      freshness: result.snapshot.freshness,
      reportPath: result.published.reportPath,
    });
    if (periodKey === "twoWeeks") {
      defaultLatestPath = result.published.latestPath;
    }
  }

  const failed = periods.every((period) => period.freshness === "unavailable");
  const partial = periods.some((period) => period.freshness !== "fresh");

  return {
    clientSlug: args.client.clientSlug,
    siteSlug: args.site.siteSlug,
    status: failed ? "failed" : partial ? "partial" : "success",
    freshness: failed ? "unavailable" : partial ? "partial" : "fresh",
    latestPath: defaultLatestPath,
    safeErrorCodes: [...safeErrorCodes],
    periods,
  } satisfies SiteSyncResult;
}

export async function syncClientSites(args: {
  clientSlug: string;
  sharedDir: string;
  env?: NodeJS.ProcessEnv;
  collectors?: SiteSourceCollectors;
  now?: () => string;
}) {
  const registry = await loadCollectorRegistry();
  const client = registry.clients.find(
    (item) => item.clientSlug === args.clientSlug,
  );
  if (!client) {
    throw new Error(`Unknown client slug: ${args.clientSlug}`);
  }
  const clusterProfile = registry.clusters.find(
    (profile) => profile.profileSlug === client.clusterProfile,
  );
  if (!clusterProfile) {
    throw new Error(`Unknown cluster profile: ${client.clusterProfile}`);
  }

  const collectors = args.collectors ?? createLiveSiteCollectors(args.env);
  const now = args.now ?? (() => new Date().toISOString());
  const results: SiteSyncResult[] = [];

  for (const site of client.sites.filter((item) => item.enabled)) {
    const trackedQuerySet =
      registry.trackedQuerySets.find(
        (querySet) =>
          querySet.clientSlug === client.clientSlug &&
          querySet.siteSlug === site.siteSlug,
      ) ?? null;
    results.push(
      await syncSite({
        client,
        site,
        sharedDir: args.sharedDir,
        collectors,
        generatedAt: now(),
        clusterProfile,
        thresholds: registry.thresholds.queryOpportunity,
        trackedQuerySet,
      }),
    );
  }

  return {
    clientSlug: client.clientSlug,
    status: results.some((result) => result.status === "failed")
      ? "failed"
      : results.some((result) => result.status === "partial")
        ? "partial"
        : "success",
    sites: results,
  };
}
