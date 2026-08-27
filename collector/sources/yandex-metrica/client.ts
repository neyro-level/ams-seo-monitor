import { findSiteConfigByUrl, getAllowedGoalsForSite } from "../../orchestration/metrica-site-config";
import { type MetricaAllowedGoal, type MetricaCounterAccess } from "../../../src/shared/schemas/metrica-source";
import { MetricaSafeError, type FetchLike, getMetricaJson } from "./http";
import {
  buildMetricaPreflight,
  buildMetricaSiteAudit,
  normalizeByTimeReport,
  normalizeDevices,
  normalizeGoals,
  normalizeGoalTotals,
  normalizeLandingPages,
  normalizeMetricaSiteUrl,
  normalizeSampleMeta,
  normalizeSummaryFromNamedRow,
  normalizeSummaryFromTotals,
  resolveCounterAccess,
} from "./normalize";
import {
  METRICA_COUNTERS_ENDPOINT,
  METRICA_GOALS_ENDPOINT,
  METRICA_REPORT_BYTIME_ENDPOINT,
  METRICA_REPORT_TABLE_ENDPOINT,
} from "./contract";

export type MetricaEnvironment = {
  token: string;
  baseUrl: string;
  targetSiteUrl: string;
  tokenStatus: string | null;
};

export type MetricaClientDependencies = {
  fetchImpl?: FetchLike;
  now?: () => string;
};

function buildGoalReachMetrics(goalIds: string[]) {
  return goalIds.map((goalId) => `ym:s:goal${goalId}reaches`);
}

function buildGoalStatMetrics(goalId: string) {
  return [
    `ym:s:goal${goalId}reaches`,
    `ym:s:goal${goalId}visits`,
    `ym:s:goal${goalId}users`,
    `ym:s:goal${goalId}conversionRate`,
  ];
}

function buildYandexOrganicFilter() {
  return "ym:s:lastsignSearchEngineRootName=='Yandex'";
}

export function readMetricaEnvironment(env: NodeJS.ProcessEnv = process.env): MetricaEnvironment {
  const token = env.YANDEX_METRICA_OAUTH_TOKEN?.trim();
  const baseUrl = env.YANDEX_METRICA_API_BASE_URL?.trim();
  const targetSiteUrl = env.YANDEX_METRICA_SITE_URL?.trim();
  const tokenStatus = env.YANDEX_METRICA_TOKEN_STATUS?.trim() ?? null;

  if (!token) {
    throw new MetricaSafeError({
      code: "MISSING_ENV",
      endpoint: "env:YANDEX_METRICA_OAUTH_TOKEN",
      message: "Required environment variable is missing: YANDEX_METRICA_OAUTH_TOKEN",
    });
  }

  if (!baseUrl) {
    throw new MetricaSafeError({
      code: "MISSING_ENV",
      endpoint: "env:YANDEX_METRICA_API_BASE_URL",
      message: "Required environment variable is missing: YANDEX_METRICA_API_BASE_URL",
    });
  }

  if (!targetSiteUrl) {
    throw new MetricaSafeError({
      code: "MISSING_ENV",
      endpoint: "env:YANDEX_METRICA_SITE_URL",
      message: "Required environment variable is missing: YANDEX_METRICA_SITE_URL",
    });
  }

  if (tokenStatus !== null && tokenStatus.toUpperCase() !== "ACTIVE") {
    throw new MetricaSafeError({
      code: "TOKEN_INACTIVE",
      endpoint: "env:YANDEX_METRICA_TOKEN_STATUS",
      message: "YANDEX_METRICA_TOKEN_STATUS is not ACTIVE",
    });
  }

  return {
    token,
    baseUrl: baseUrl.replace(/\/$/, ""),
    targetSiteUrl: normalizeMetricaSiteUrl(targetSiteUrl),
    tokenStatus,
  };
}

export function createMetricaClient(config: MetricaEnvironment, deps: MetricaClientDependencies = {}) {
  const fetchImpl = deps.fetchImpl;
  const now = deps.now ?? (() => new Date().toISOString());

  async function listCounters(searchString?: string) {
    return getMetricaJson({
      baseUrl: config.baseUrl,
      token: config.token,
      endpoint: METRICA_COUNTERS_ENDPOINT,
      query: {
        per_page: 1000,
        search_string: searchString ?? undefined,
      },
      fetchImpl,
    });
  }

  async function resolveCounterBySite(): Promise<MetricaCounterAccess> {
    const payload = await listCounters(config.targetSiteUrl);
    const access = resolveCounterAccess(payload, config.targetSiteUrl);
    if (!access) {
      throw new MetricaSafeError({
        code: "COUNTER_MISSING",
        endpoint: METRICA_COUNTERS_ENDPOINT,
        message: "Target site counter is not available to the OAuth user in Yandex Metrica",
      });
    }
    return access;
  }

  async function listGoals(counterId: string) {
    return getMetricaJson({
      baseUrl: config.baseUrl,
      token: config.token,
      endpoint: METRICA_GOALS_ENDPOINT(counterId),
      fetchImpl,
    });
  }

  async function getTableReport(query: Record<string, string | number | boolean | Array<string | number | boolean> | null | undefined>) {
    return getMetricaJson({
      baseUrl: config.baseUrl,
      token: config.token,
      endpoint: METRICA_REPORT_TABLE_ENDPOINT,
      query,
      fetchImpl,
    });
  }

  async function getByTimeReport(query: Record<string, string | number | boolean | Array<string | number | boolean> | null | undefined>) {
    return getMetricaJson({
      baseUrl: config.baseUrl,
      token: config.token,
      endpoint: METRICA_REPORT_BYTIME_ENDPOINT,
      query,
      fetchImpl,
    });
  }

  async function preflight() {
    const access = await resolveCounterBySite();
    const goals = normalizeGoals(await listGoals(access.counterId));
    return buildMetricaPreflight({
      checkedAt: now(),
      access,
      goals,
    });
  }

  async function collectSiteData(options?: {
    date1?: string;
    date2?: string;
    landingLimit?: number;
  }) {
    const siteConfig = await findSiteConfigByUrl(`https://${config.targetSiteUrl}`);
    if (!siteConfig) {
      throw new MetricaSafeError({
        code: "INVALID_RESPONSE",
        endpoint: "config:clients",
        message: "Target site is not registered in local client config",
      });
    }

    const access = await resolveCounterBySite();
    const goals = normalizeGoals(await listGoals(access.counterId));
    const allowedGoals = getAllowedGoalsForSite({
      site: siteConfig.site,
      goalProfile: siteConfig.goalProfile,
    });
    const goalReachesMetrics = buildGoalReachMetrics(allowedGoals.map((goal) => goal.goalId));
    const timezone = siteConfig.site.timezone;
    const commonDates = {
      date1: options?.date1 ?? "30daysAgo",
      date2: options?.date2 ?? "today",
      timezone,
    };

    const allTrafficPayload = await getTableReport({
      ids: access.counterId,
      metrics: [
        "ym:s:visits",
        "ym:s:users",
        "ym:s:pageviews",
        "ym:s:bounceRate",
        "ym:s:pageDepth",
        "ym:s:avgVisitDurationSeconds",
        ...goalReachesMetrics,
      ],
      ...commonDates,
    });

    const searchEnginePayload = await getTableReport({
      ids: access.counterId,
      dimensions: "ym:s:lastsignSearchEngineRootName",
      metrics: [
        "ym:s:visits",
        "ym:s:users",
        "ym:s:pageviews",
        "ym:s:bounceRate",
        "ym:s:pageDepth",
        "ym:s:avgVisitDurationSeconds",
        ...goalReachesMetrics,
      ],
      sort: "-ym:s:visits",
      limit: 20,
      ...commonDates,
    });

    const organicFilter = buildYandexOrganicFilter();

    const byTimePayload = await getByTimeReport({
      ids: access.counterId,
      metrics: ["ym:s:visits", ...goalReachesMetrics],
      filters: organicFilter,
      group: "day",
      ...commonDates,
    });

    const landingPayload = await getTableReport({
      ids: access.counterId,
      dimensions: "ym:s:startURLPath",
      metrics: [
        "ym:s:visits",
        "ym:s:users",
        "ym:s:pageviews",
        "ym:s:bounceRate",
        "ym:s:pageDepth",
        "ym:s:avgVisitDurationSeconds",
        ...goalReachesMetrics,
      ],
      filters: organicFilter,
      sort: "-ym:s:visits",
      limit: options?.landingLimit ?? 50,
      ...commonDates,
    });

    const devicesPayload = await getTableReport({
      ids: access.counterId,
      dimensions: "ym:s:deviceCategory",
      metrics: ["ym:s:visits", "ym:s:users", ...goalReachesMetrics],
      filters: organicFilter,
      sort: "-ym:s:visits",
      limit: 10,
      ...commonDates,
    });

    const goalsSummaryPayloads: Array<{ allowedGoal: MetricaAllowedGoal; payload: unknown }> = [];
    for (const allowedGoal of allowedGoals) {
      const payload = await getTableReport({
        ids: access.counterId,
        metrics: buildGoalStatMetrics(allowedGoal.goalId),
        filters: organicFilter,
        ...commonDates,
      });
      goalsSummaryPayloads.push({ allowedGoal, payload });
    }

    return buildMetricaSiteAudit({
      fetchedAt: now(),
      access,
      goals,
      allowedGoals,
      allTrafficMeta: normalizeSampleMeta(allTrafficPayload),
      allTrafficSummary: normalizeSummaryFromTotals(allTrafficPayload),
      organicMeta: normalizeSampleMeta(searchEnginePayload),
      organicSummary: normalizeSummaryFromNamedRow(searchEnginePayload, "Yandex"),
      byTime: normalizeByTimeReport(byTimePayload),
      landingPages: normalizeLandingPages(landingPayload),
      devices: normalizeDevices(devicesPayload),
      goalsMeta: goalsSummaryPayloads.length > 0 ? normalizeSampleMeta(goalsSummaryPayloads[0].payload) : normalizeSampleMeta({}),
      goalsSummary: goalsSummaryPayloads.map((item) => normalizeGoalTotals(item.payload, item.allowedGoal)),
    });
  }

  return {
    preflight,
    collectSiteData,
  };
}
