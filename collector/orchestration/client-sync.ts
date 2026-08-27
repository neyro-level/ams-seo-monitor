import type { MetricaSiteAudit } from "../../src/shared/schemas/metrica-source";
import type { ClientRegistry, SiteRegistry } from "../../src/shared/schemas/registry";
import type { WebmasterSiteData } from "../../src/shared/schemas/webmaster-source";
import { readLatestSiteSnapshot, publishSiteSnapshot } from "../storage/snapshots";
import { createMetricaClient, readMetricaEnvironment } from "../sources/yandex-metrica/client";
import { MetricaSafeError } from "../sources/yandex-metrica/http";
import { createWebmasterClient, readWebmasterEnvironment } from "../sources/yandex-webmaster/client";
import { WebmasterSafeError } from "../sources/yandex-webmaster/http";
import { loadCollectorRegistry } from "./metrica-site-config";
import {
  compileSiteReportSnapshot,
  type SafeSourceFailure,
} from "./report-compiler";

export type SiteSourceCollectors = {
  webmaster: (site: SiteRegistry) => Promise<WebmasterSiteData>;
  metrica: (
    site: SiteRegistry,
    period?: { dateFrom: string; dateTo: string },
  ) => Promise<MetricaSiteAudit>;
};

export type SiteSyncResult = {
  clientSlug: string;
  siteSlug: string;
  status: "success" | "partial" | "failed";
  freshness: "fresh" | "stale" | "partial" | "unavailable";
  latestPath: string;
  safeErrorCodes: string[];
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

export function createLiveSiteCollectors(env: NodeJS.ProcessEnv = process.env): SiteSourceCollectors {
  return {
    async webmaster(site) {
      const config = readWebmasterEnvironment({
        ...env,
        YANDEX_WEBMASTER_SITE_URL: site.siteUrl,
      });
      return createWebmasterClient(config).collectSiteData({ queryLimit: 500 });
    },
    async metrica(site, period) {
      const config = readMetricaEnvironment({
        ...env,
        YANDEX_METRICA_SITE_URL: site.siteUrl,
      });
      return createMetricaClient(config).collectSiteData({
        date1: period?.dateFrom,
        date2: period?.dateTo,
        landingLimit: 50,
      });
    },
  };
}

async function syncSite(args: {
  client: ClientRegistry;
  site: SiteRegistry;
  sharedDir: string;
  collectors: SiteSourceCollectors;
  generatedAt: string;
  thresholds: {
    minimumShows: number;
    maximumCtrPercent: number;
    maximumAveragePosition: number;
  };
}) {
  const previous = await readLatestSiteSnapshot(
    args.sharedDir,
    args.client.clientSlug,
    args.site.siteSlug,
  );
  let webmasterData: WebmasterSiteData | null = null;
  let metricaData: MetricaSiteAudit | null = null;
  let webmasterFailure: SafeSourceFailure | null = null;
  let metricaFailure: SafeSourceFailure | null = null;

  if (args.site.webmaster.enabled) {
    try {
      webmasterData = await args.collectors.webmaster(args.site);
    } catch (error) {
      webmasterFailure = safeFailure(error);
    }
  }

  if (args.site.metrica.enabled) {
    try {
      const webmasterPeriod = webmasterData?.queryCollections.find(
        (collection) =>
          collection.device === "ALL" &&
          collection.orderBy === "TOTAL_SHOWS" &&
          collection.dateFrom !== null &&
          collection.dateTo !== null,
      );
      metricaData = await args.collectors.metrica(
        args.site,
        webmasterPeriod?.dateFrom && webmasterPeriod.dateTo
          ? {
              dateFrom: webmasterPeriod.dateFrom,
              dateTo: webmasterPeriod.dateTo,
            }
          : undefined,
      );
    } catch (error) {
      metricaFailure = safeFailure(error);
    }
  }

  const snapshot = compileSiteReportSnapshot({
    clientSlug: args.client.clientSlug,
    site: args.site,
    generatedAt: args.generatedAt,
    webmasterData,
    metricaData,
    webmasterFailure,
    metricaFailure,
    previous,
    queryThresholds: args.thresholds,
  });
  const published = await publishSiteSnapshot({
    rootDir: args.sharedDir,
    snapshot,
  });
  const safeErrorCodes = [webmasterFailure?.code, metricaFailure?.code].filter(
    (code): code is string => Boolean(code),
  );

  return {
    clientSlug: args.client.clientSlug,
    siteSlug: args.site.siteSlug,
    status:
      snapshot.freshness === "fresh"
        ? ("success" as const)
        : snapshot.freshness === "unavailable"
          ? ("failed" as const)
          : ("partial" as const),
    freshness: snapshot.freshness,
    latestPath: published.latestPath,
    safeErrorCodes,
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
  const client = registry.clients.find((item) => item.clientSlug === args.clientSlug);
  if (!client) {
    throw new Error(`Unknown client slug: ${args.clientSlug}`);
  }

  const collectors = args.collectors ?? createLiveSiteCollectors(args.env);
  const now = args.now ?? (() => new Date().toISOString());
  const results: SiteSyncResult[] = [];

  for (const site of client.sites.filter((item) => item.enabled)) {
    results.push(
      await syncSite({
        client,
        site,
        sharedDir: args.sharedDir,
        collectors,
        generatedAt: now(),
        thresholds: registry.thresholds.queryOpportunity,
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
