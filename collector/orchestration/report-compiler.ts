import {
  siteReportSnapshotSchema,
  type CombinedSeoReport,
  type MetricaReport,
  type ReportComparison,
  type ReportPeriodKey,
  type SiteReportSnapshot,
  type WebmasterReport,
} from "../../src/shared/schemas/report";
import type {
  ClusterProfile,
  SiteRegistry,
} from "../../src/shared/schemas/registry";
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
  clusterProfile: ClusterProfile;
  previousWebmasterData?: WebmasterSiteData | null;
  previousMetricaData?: MetricaSiteAudit | null;
  periodKey?: ReportPeriodKey;
  currentPeriod?: { dateFrom: string; dateTo: string };
  previousPeriod?: { dateFrom: string; dateTo: string };
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

function classifyQuery(query: string, profile: ClusterProfile) {
  const normalized = query.toLocaleLowerCase("ru");
  const brandGroup = profile.groups.find((group) => group.slug === "brand");
  if (profile.brandTerms.some((term) => normalized.includes(term.toLocaleLowerCase("ru")))) {
    return brandGroup?.label ?? "Бренд";
  }

  for (const group of profile.groups) {
    if (group.slug === "brand") continue;
    if (group.terms.some((term) => normalized.includes(term.toLocaleLowerCase("ru")))) {
      return group.label;
    }
  }

  return "Другое";
}

function compileWebmasterReport(
  data: WebmasterSiteData,
  thresholds: CompileSiteReportArgs["queryThresholds"],
  clusterProfile: ClusterProfile,
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
  const poolShows = allDeviceQueries.reduce((sum, query) => sum + query.shows, 0);
  const poolClicks = allDeviceQueries.reduce((sum, query) => sum + query.clicks, 0);
  const historyByIndicator = new Map(
    data.allQueryHistory.map((history) => [history.indicator, history.points]),
  );
  const showHistory = historyByIndicator.get("TOTAL_SHOWS") ?? [];
  const clickHistoryByDate = new Map(
    (historyByIndicator.get("TOTAL_CLICKS") ?? []).map((point) => [
      point.date.slice(0, 10),
      point.value,
    ]),
  );
  const positionHistoryByDate = new Map(
    (historyByIndicator.get("AVG_SHOW_POSITION") ?? []).map((point) => [
      point.date.slice(0, 10),
      point.value,
    ]),
  );
  const shows =
    showHistory.length > 0
      ? showHistory.reduce((sum, point) => sum + point.value, 0)
      : poolShows;
  const clicks =
    showHistory.length > 0
      ? [...clickHistoryByDate.values()].reduce((sum, value) => sum + value, 0)
      : poolClicks;
  const weightedPositionNumerator =
    showHistory.length > 0
      ? showHistory.reduce((sum, point) => {
          const date = point.date.slice(0, 10);
          return sum + (positionHistoryByDate.get(date) ?? 0) * point.value;
        }, 0)
      : allDeviceQueries.reduce(
          (sum, query) => sum + (query.avgShowPosition ?? 0) * query.shows,
          0,
        );
  const weightedPositionDenominator =
    showHistory.length > 0
      ? showHistory.reduce((sum, point) => {
          const date = point.date.slice(0, 10);
          return sum + (positionHistoryByDate.has(date) ? point.value : 0);
        }, 0)
      : allDeviceQueries.reduce(
          (sum, query) => sum + (query.avgShowPosition === null ? 0 : query.shows),
          0,
        );
  const allCollection = data.queryCollections.find(
    (collection) => collection.device === "ALL" && collection.orderBy === "TOTAL_SHOWS",
  );
  const trendDate = allCollection?.dateTo ?? data.fetchedAt.slice(0, 10);
  const visibilityTrend =
    showHistory.length > 0
      ? showHistory.map((point) => {
          const date = point.date.slice(0, 10);
          return {
            label: date,
            date,
            value: point.value,
            secondaryValue: clickHistoryByDate.get(date) ?? null,
            tertiaryValue: positionHistoryByDate.get(date) ?? null,
          };
        })
      : [
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
        ];
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
    visibilityTrend,
    queries: mergedQueries.slice(0, 500).map((query) => ({
      queryId: query.queryId,
      query: query.queryText,
      cluster: classifyQuery(query.queryText, clusterProfile),
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
      targetVisits: data.yandexOrganic.summary.targetVisits,
      targetUsers: data.yandexOrganic.summary.targetUsers,
      allVisits: data.allTraffic.summary.visits,
      conversionRate: data.yandexOrganic.summary.conversionRate,
    },
    organicTrend: data.yandexOrganic.byTime.map((point) => ({
      label: point.date,
      date: point.date,
      value: point.visits,
      secondaryValue: point.targetVisits,
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
      targetVisits: page.targetVisits,
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
  comparison: ReportComparison | null;
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

  const comparison = args.comparison?.metrics;
  const trendAlerts = [
    {
      active:
        (comparison?.clicks.previous ?? 0) >= 10 &&
        (comparison?.clicks.deltaPercent ?? 0) <= -30,
      id: "clicks-decline",
      title: "Снижение кликов из поиска",
      summary: `Клики снизились на ${Math.abs(comparison?.clicks.deltaPercent ?? 0).toFixed(1)}%.`,
    },
    {
      active:
        (comparison?.shows.previous ?? 0) >= 100 &&
        (comparison?.shows.deltaPercent ?? 0) <= -30,
      id: "shows-decline",
      title: "Снижение показов в поиске",
      summary: `Показы снизились на ${Math.abs(comparison?.shows.deltaPercent ?? 0).toFixed(1)}%.`,
    },
    {
      active:
        (comparison?.organicVisits.previous ?? 0) >= 20 &&
        (comparison?.organicVisits.deltaPercent ?? 0) <= -30,
      id: "organic-decline",
      title: "Снижение органического трафика",
      summary: `Органические визиты снизились на ${Math.abs(comparison?.organicVisits.deltaPercent ?? 0).toFixed(1)}%.`,
    },
    {
      active:
        (comparison?.pagesInSearch.previous ?? 0) >= 10 &&
        (comparison?.pagesInSearch.deltaPercent ?? 0) <= -10,
      id: "pages-decline",
      title: "Снижение числа страниц в поиске",
      summary: `Страниц в поиске стало меньше на ${Math.abs(comparison?.pagesInSearch.deltaPercent ?? 0).toFixed(1)}%.`,
    },
    {
      active:
        (comparison?.shows.previous ?? 0) >= 100 &&
        (comparison?.avgPosition.deltaPoints ?? 0) <= -2,
      id: "position-decline",
      title: "Ухудшение средней позиции",
      summary: `Средняя позиция ухудшилась на ${Math.abs(comparison?.avgPosition.deltaPoints ?? 0).toFixed(1)}.`,
    },
  ];
  for (const alert of trendAlerts) {
    if (!alert.active) continue;
    alerts.push({
      id: alert.id,
      title: alert.title,
      summary: alert.summary,
      tone: "warning",
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
      summary: `${query.shows} показов, CTR ${(query.ctrPercent ?? 0).toFixed(2)}%, позиция ${(query.avgShowPosition ?? 0).toFixed(1)}.`,
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

function buildMetricComparison(
  current: number | null,
  previous: number | null,
  mode: "percent" | "points" | "position",
) {
  const deltaPercent =
    mode === "percent" && current !== null && previous !== null && previous !== 0
      ? Number((((current - previous) / previous) * 100).toFixed(2))
      : null;
  const deltaPoints =
    mode === "points" && current !== null && previous !== null
      ? Number((current - previous).toFixed(2))
      : mode === "position" && current !== null && previous !== null
        ? Number((previous - current).toFixed(2))
        : null;

  return {
    current,
    previous,
    deltaPercent,
    deltaPoints,
  };
}

function buildReportComparison(args: {
  periodKey: ReportPeriodKey;
  currentPeriod?: { dateFrom: string; dateTo: string };
  previousPeriod?: { dateFrom: string; dateTo: string };
  currentWebmaster: WebmasterReport | null;
  previousWebmaster: WebmasterReport | null;
  currentMetrica: MetricaReport | null;
  previousMetrica: MetricaReport | null;
}): ReportComparison | null {
  if (!args.currentPeriod || !args.previousPeriod) {
    return null;
  }

  const currentOrganicShare =
    args.currentMetrica && args.currentMetrica.summary.allVisits > 0
      ? (args.currentMetrica.summary.visits / args.currentMetrica.summary.allVisits) * 100
      : null;
  const previousOrganicShare =
    args.previousMetrica && args.previousMetrica.summary.allVisits > 0
      ? (args.previousMetrica.summary.visits / args.previousMetrica.summary.allVisits) * 100
      : null;

  return {
    periodKey: args.periodKey,
    currentPeriod: args.currentPeriod,
    previousPeriod: args.previousPeriod,
    metrics: {
      shows: buildMetricComparison(
        args.currentWebmaster?.summary.shows ?? null,
        args.previousWebmaster?.summary.shows ?? null,
        "percent",
      ),
      clicks: buildMetricComparison(
        args.currentWebmaster?.summary.clicks ?? null,
        args.previousWebmaster?.summary.clicks ?? null,
        "percent",
      ),
      ctr: buildMetricComparison(
        args.currentWebmaster?.summary.ctr ?? null,
        args.previousWebmaster?.summary.ctr ?? null,
        "points",
      ),
      avgPosition: buildMetricComparison(
        args.currentWebmaster?.summary.avgPosition ?? null,
        args.previousWebmaster?.summary.avgPosition ?? null,
        "position",
      ),
      organicVisits: buildMetricComparison(
        args.currentMetrica?.summary.visits ?? null,
        args.previousMetrica?.summary.visits ?? null,
        "percent",
      ),
      targetVisits: buildMetricComparison(
        args.currentMetrica?.summary.targetVisits ?? null,
        args.previousMetrica?.summary.targetVisits ?? null,
        "percent",
      ),
      conversionRate: buildMetricComparison(
        args.currentMetrica?.summary.conversionRate ?? null,
        args.previousMetrica?.summary.conversionRate ?? null,
        "points",
      ),
      pagesInSearch: buildMetricComparison(
        args.currentWebmaster?.summary.pagesInSearch ?? null,
        args.previousWebmaster?.summary.pagesInSearch ?? null,
        "percent",
      ),
      organicShare: buildMetricComparison(
        currentOrganicShare,
        previousOrganicShare,
        "points",
      ),
    },
  };
}

export function compileSiteReportSnapshot(args: CompileSiteReportArgs): SiteReportSnapshot {
  const currentWebmaster = args.webmasterData
    ? compileWebmasterReport(args.webmasterData, args.queryThresholds, args.clusterProfile)
    : null;
  const currentMetrica = args.metricaData ? compileMetricaReport(args.metricaData) : null;
  const previousWebmaster = args.previousWebmasterData
    ? compileWebmasterReport(
        args.previousWebmasterData,
        args.queryThresholds,
        args.clusterProfile,
      )
    : null;
  const previousMetrica = args.previousMetricaData
    ? compileMetricaReport(args.previousMetricaData)
    : null;
  const periodKey = args.periodKey ?? "week";
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
  const comparison = buildReportComparison({
    periodKey,
    currentPeriod: args.currentPeriod,
    previousPeriod: args.previousPeriod,
    currentWebmaster,
    previousWebmaster,
    currentMetrica,
    previousMetrica,
  });

  return siteReportSnapshotSchema.parse({
    schemaVersion: 1,
    clientSlug: args.clientSlug,
    siteSlug: args.site.siteSlug,
    siteUrl: args.site.siteUrl,
    generatedAt: args.generatedAt,
    periodKey,
    comparison,
    freshness: hasAnyReport ? (partial ? "partial" : "fresh") : "unavailable",
    sources: {
      webmaster: {
        status: webmasterStatus,
        fetchedAt: args.webmasterData?.fetchedAt ?? args.previous?.sources.webmaster.fetchedAt ?? args.generatedAt,
        periodStart: args.currentPeriod?.dateFrom ?? webmasterPeriod?.dateFrom ?? null,
        periodEnd: args.currentPeriod?.dateTo ?? webmasterPeriod?.dateTo ?? null,
        timezone: args.site.timezone,
        note: args.webmasterData?.partial
          ? `${args.webmasterData.endpointErrors.length} endpoint errors`
          : null,
        safeErrorCode: args.webmasterFailure?.code ?? null,
      },
      metrica: {
        status: metricaStatus,
        fetchedAt: args.metricaData?.fetchedAt ?? args.previous?.sources.metrica.fetchedAt ?? args.generatedAt,
        periodStart: args.currentPeriod?.dateFrom ?? metricaPeriod?.date1 ?? null,
        periodEnd: args.currentPeriod?.dateTo ?? metricaPeriod?.date2 ?? null,
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
      comparison,
      webmasterFailure: args.webmasterFailure,
      metricaFailure: args.metricaFailure,
    }),
  });
}
