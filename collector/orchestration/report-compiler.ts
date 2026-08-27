import {
  siteReportSnapshotSchema,
  type CombinedSeoReport,
  type MetricaReport,
  type SiteReportSnapshot,
  type WebmasterReport,
} from "../../src/shared/schemas/report";
import type { SiteRegistry } from "../../src/shared/schemas/registry";
import type { MetricaSiteAudit } from "../../src/shared/schemas/metrica-source";
import type { WebmasterSiteData } from "../../src/shared/schemas/webmaster-source";
import {
  buildQueryOpportunities,
  mergeWebmasterQueryCollections,
} from "../analytics/webmaster-queries";

export type SafeSourceFailure = {
  code: string;
  status: number | null;
};

type CompileSiteReportArgs = {
  clientSlug: string;
  site: SiteRegistry;
  generatedAt: string;
  webmasterData: WebmasterSiteData | null;
  metricaData: MetricaSiteAudit | null;
  webmasterFailure?: SafeSourceFailure | null;
  metricaFailure?: SafeSourceFailure | null;
  previous?: SiteReportSnapshot | null;
  queryThresholds: {
    minimumShows: number;
    maximumCtrPercent: number;
    maximumAveragePosition: number;
  };
};

function latestHistoryValue(
  histories: Array<{ points: Array<{ date: string; value: number }> }>,
) {
  return histories.reduce((sum, history) => sum + (history.points.at(-1)?.value ?? 0), 0);
}

function compileWebmasterReport(
  data: WebmasterSiteData,
  thresholds: CompileSiteReportArgs["queryThresholds"],
): WebmasterReport {
  const mergedQueries = mergeWebmasterQueryCollections(data.queryCollections);
  const opportunities = buildQueryOpportunities(mergedQueries, thresholds);
  const opportunityTypes = new Map<string, string[]>();

  for (const opportunity of opportunities) {
    const key = `${opportunity.queryId}::${opportunity.device}`;
    const labels = opportunityTypes.get(key) ?? [];
    const labelByType = {
      high_impressions_low_ctr: "высокие показы / низкий CTR",
      positions_4_10: "позиции 4–10",
      positions_11_20: "позиции 11–20",
      zero_clicks: "нет кликов",
    } as const;
    labels.push(labelByType[opportunity.type]);
    opportunityTypes.set(key, labels);
  }

  const allDeviceQueries = mergedQueries.filter((query) => query.device === "ALL");
  const shows = allDeviceQueries.reduce((sum, query) => sum + query.shows, 0);
  const clicks = allDeviceQueries.reduce((sum, query) => sum + query.clicks, 0);
  const weightedPositionNumerator = allDeviceQueries.reduce(
    (sum, query) => sum + (query.avgShowPosition ?? 0) * query.shows,
    0,
  );
  const weightedPositionDenominator = allDeviceQueries.reduce(
    (sum, query) => sum + (query.avgShowPosition === null ? 0 : query.shows),
    0,
  );
  const allCollection = data.queryCollections.find(
    (collection) => collection.device === "ALL" && collection.orderBy === "TOTAL_SHOWS",
  );
  const trendDate = allCollection?.dateTo ?? data.fetchedAt.slice(0, 10);
  const sitemap = data.sitemaps.find((item) => item.url !== null) ?? null;

  return {
    summary: {
      shows,
      clicks,
      ctr: shows > 0 ? Number(((clicks / shows) * 100).toFixed(2)) : 0,
      avgPosition:
        weightedPositionDenominator > 0
          ? Number((weightedPositionNumerator / weightedPositionDenominator).toFixed(2))
          : null,
      pagesInSearch:
        data.pagesInSearchHistory.at(-1)?.value ?? data.summary.searchablePages ?? 0,
      excludedPages: data.summary.excludedPages ?? 0,
      sitemapUrls: sitemap?.urlsTotal ?? 0,
      sqi: data.summary.sqi,
    },
    visibilityTrend: [
      {
        label: trendDate,
        date: trendDate,
        value: shows,
        secondaryValue: clicks,
        tertiaryValue:
          weightedPositionDenominator > 0
            ? Number((weightedPositionNumerator / weightedPositionDenominator).toFixed(2))
            : null,
      },
    ],
    queries: mergedQueries.slice(0, 500).map((query) => ({
      queryId: query.queryId,
      query: query.queryText,
      cluster: "Не классифицирован",
      device: query.device === "MOBILE_AND_TABLET" || query.device === "TABLET" ? "MOBILE" : query.device,
      shows: query.shows,
      clicks: query.clicks,
      ctr: query.ctrPercent ?? 0,
      avgShowPosition: query.avgShowPosition ?? 0,
      avgClickPosition: query.avgClickPosition,
      previousShows: null,
      previousClicks: null,
      deltaClicksPercent: null,
      deltaCtrPoints: null,
      opportunityType:
        opportunityTypes.get(`${query.queryId}::${query.device}`)?.join(", ") ?? "наблюдение",
    })),
    diagnostics: data.diagnostics
      .filter((diagnostic) => diagnostic.state === "PRESENT")
      .map((diagnostic) => ({
        severity:
          diagnostic.severity === "FATAL" || diagnostic.severity === "CRITICAL"
            ? "error"
            : diagnostic.severity === "POSSIBLE_PROBLEM"
              ? "warning"
              : "info",
        title: diagnostic.code,
        description: `Состояние: ${diagnostic.state}. Обновлено: ${diagnostic.lastStateUpdate ?? "нет даты"}.`,
      })),
    sitemap: sitemap?.url
      ? {
          url: sitemap.url,
          urls: sitemap.urlsTotal ?? 0,
          errors: sitemap.errorsCount ?? 0,
        }
      : null,
    links: {
      external: latestHistoryValue(data.externalLinksHistory),
      brokenInternal: latestHistoryValue(data.brokenInternalLinksHistory),
    },
  };
}

function compileMetricaReport(data: MetricaSiteAudit): MetricaReport {
  return {
    summary: {
      visits: data.yandexOrganic.summary.visits,
      users: data.yandexOrganic.summary.users,
      pageviews: data.yandexOrganic.summary.pageviews,
      bounceRate: data.yandexOrganic.summary.bounceRate,
      depth: data.yandexOrganic.summary.pageDepth,
      averageVisitDurationSeconds: data.yandexOrganic.summary.averageVisitDurationSeconds,
      goalReaches: data.yandexOrganic.summary.goalReaches,
      conversionRate: data.yandexOrganic.summary.conversionRate,
    },
    organicTrend: data.yandexOrganic.byTime.map((point) => ({
      label: point.date,
      date: point.date,
      value: point.visits,
      secondaryValue: point.goalReaches,
      tertiaryValue: point.conversionRate,
    })),
    landingPages: data.yandexOrganic.landingPages.map((page) => ({
      path: page.path,
      visits: page.visits,
      users: page.users,
      pageviews: page.pageviews,
      bounceRate: page.bounceRate,
      depth: page.pageDepth,
      durationSeconds: page.averageVisitDurationSeconds,
      goals: page.goalReaches,
      conversionRate: page.conversionRate,
      trendLabel: "Без сравнения с предыдущим периодом",
    })),
    devices: data.yandexOrganic.devices.map((device) => ({
      device: device.device,
      visits: device.visits,
      conversionRate: device.conversionRate,
    })),
    goals: data.goalsSummary.items.map((goal) => ({
      label: goal.name,
      category: goal.category,
      reaches: goal.reaches,
      conversionRate: goal.conversionRate,
    })),
  };
}

function sourceStatus(
  enabled: boolean,
  hasData: boolean,
  partial: boolean,
  failure?: SafeSourceFailure | null,
) {
  if (!enabled) return "not_configured" as const;
  if (hasData && partial) return "partial" as const;
  if (hasData) return "success" as const;
  if (failure?.status === 401 || failure?.status === 403) return "access_denied" as const;
  if (failure?.status === 420 || failure?.status === 429) return "quota_limited" as const;
  return "failed" as const;
}

function compileCombinedReport(args: {
  webmaster: WebmasterReport | null;
  metrica: MetricaReport | null;
  webmasterData: WebmasterSiteData | null;
  webmasterFailure?: SafeSourceFailure | null;
  metricaFailure?: SafeSourceFailure | null;
}): CombinedSeoReport {
  const alerts: CombinedSeoReport["alerts"] = [];
  const opportunities: CombinedSeoReport["opportunities"] = [];

  for (const diagnostic of args.webmaster?.diagnostics ?? []) {
    if (diagnostic.severity !== "error") continue;
    alerts.push({
      id: `webmaster-${diagnostic.title}`,
      title: diagnostic.title,
      summary: diagnostic.description,
      tone: "error",
    });
  }

  if (args.webmasterFailure) {
    alerts.push({
      id: "webmaster-source-failure",
      title: "Яндекс.Вебмастер недоступен",
      summary: `Безопасный код ошибки: ${args.webmasterFailure.code}`,
      tone: "error",
    });
  }
  if (args.metricaFailure) {
    alerts.push({
      id: "metrica-source-failure",
      title: "Яндекс.Метрика недоступна",
      summary: `Безопасный код ошибки: ${args.metricaFailure.code}`,
      tone: "error",
    });
  }

  const mergedQueries = args.webmasterData
    ? mergeWebmasterQueryCollections(args.webmasterData.queryCollections)
    : [];
  for (const query of mergedQueries
    .filter(
      (item) =>
        item.device === "ALL" &&
        item.avgShowPosition !== null &&
        item.avgShowPosition >= 4 &&
        item.avgShowPosition <= 10,
    )
    .slice(0, 3)) {
    opportunities.push({
      id: `query-${query.queryId}`,
      title: query.queryText,
      summary: `${query.shows} показов, CTR ${query.ctrPercent ?? 0}%, позиция ${query.avgShowPosition}.`,
      source: "webmaster",
      tone: "info",
    });
  }

  return {
    funnel: {
      shows: args.webmaster?.summary.shows ?? 0,
      clicks: args.webmaster?.summary.clicks ?? 0,
      visits: args.metrica?.summary.visits ?? 0,
      goalReaches: args.metrica?.summary.goalReaches ?? 0,
      caveats: [
        "Клики Вебмастера и визиты Метрики считаются разными системами и не совпадают один к одному.",
        "Сумма достижений целей не является числом уникальных заявок.",
      ],
    },
    opportunities,
    alerts,
    methodology: [
      "Вебмастер показывает наблюдаемую поисковую видимость, а не частотность Wordstat.",
      "Метрика показывает агрегированный трафик из поиска Яндекса без пользовательских данных.",
      "Связь конкретный запрос → конкретная заявка не утверждается.",
    ],
  };
}

export function compileSiteReportSnapshot(args: CompileSiteReportArgs): SiteReportSnapshot {
  const currentWebmaster = args.webmasterData
    ? compileWebmasterReport(args.webmasterData, args.queryThresholds)
    : null;
  const currentMetrica = args.metricaData ? compileMetricaReport(args.metricaData) : null;
  const webmaster = currentWebmaster ?? args.previous?.webmaster ?? null;
  const metrica = currentMetrica ?? args.previous?.metrica ?? null;
  const webmasterStatus = sourceStatus(
    args.site.webmaster.enabled,
    args.webmasterData !== null,
    args.webmasterData?.partial ?? false,
    args.webmasterFailure,
  );
  const metricaStatus = sourceStatus(
    args.site.metrica.enabled,
    args.metricaData !== null,
    false,
    args.metricaFailure,
  );
  const webmasterPeriod = args.webmasterData?.queryCollections[0] ?? null;
  const metricaPeriod = args.metricaData?.yandexOrganic.meta ?? null;
  const hasAnyReport = webmaster !== null || metrica !== null;
  const partial = webmasterStatus !== "success" || metricaStatus !== "success";

  return siteReportSnapshotSchema.parse({
    schemaVersion: 1,
    clientSlug: args.clientSlug,
    siteSlug: args.site.siteSlug,
    siteUrl: args.site.siteUrl,
    generatedAt: args.generatedAt,
    freshness: hasAnyReport ? (partial ? "partial" : "fresh") : "unavailable",
    sources: {
      webmaster: {
        status: webmasterStatus,
        fetchedAt: args.webmasterData?.fetchedAt ?? args.previous?.sources.webmaster.fetchedAt ?? args.generatedAt,
        periodStart: webmasterPeriod?.dateFrom ?? null,
        periodEnd: webmasterPeriod?.dateTo ?? null,
        timezone: args.site.timezone,
        note: args.webmasterData?.partial
          ? `${args.webmasterData.endpointErrors.length} endpoint errors`
          : null,
        safeErrorCode: args.webmasterFailure?.code ?? null,
      },
      metrica: {
        status: metricaStatus,
        fetchedAt: args.metricaData?.fetchedAt ?? args.previous?.sources.metrica.fetchedAt ?? args.generatedAt,
        periodStart: metricaPeriod?.date1 ?? null,
        periodEnd: metricaPeriod?.date2 ?? null,
        timezone: args.site.timezone,
        note: metricaPeriod?.sampled ? "Отчёт построен с семплированием" : null,
        safeErrorCode: args.metricaFailure?.code ?? null,
      },
    },
    webmaster,
    metrica,
    combined: compileCombinedReport({
      webmaster,
      metrica,
      webmasterData: args.webmasterData,
      webmasterFailure: args.webmasterFailure,
      metricaFailure: args.metricaFailure,
    }),
  });
}
