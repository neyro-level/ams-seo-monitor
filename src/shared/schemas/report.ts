import { z } from "zod";
import { slugPattern, timezonePattern } from "./registry";

const isoDateTimeSchema = z.string().datetime({ offset: true });
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const sourceStatusSchema = z.enum([
  "success",
  "partial",
  "failed",
  "not_configured",
  "access_denied",
  "quota_limited",
  "stale",
]);

export const sourceStateSchema = z.object({
  status: sourceStatusSchema,
  fetchedAt: isoDateTimeSchema,
  periodStart: isoDateSchema.nullable(),
  periodEnd: isoDateSchema.nullable(),
  timezone: z.string().regex(timezonePattern),
  note: z.string().nullable(),
  safeErrorCode: z.string().nullable(),
});

const severitySchema = z.enum(["success", "info", "warning", "error"]);

export const trendPointSchema = z.object({
  label: z.string().min(1),
  date: isoDateSchema,
  value: z.number().nonnegative(),
  secondaryValue: z.number().nonnegative().nullable(),
  tertiaryValue: z.number().nullable(),
});

export const webmasterQuerySchema = z.object({
  queryId: z.string().min(1),
  query: z.string().min(1),
  cluster: z.string().min(1),
  device: z.enum(["ALL", "DESKTOP", "MOBILE"]),
  shows: z.number().nonnegative(),
  clicks: z.number().nonnegative(),
  ctr: z.number().nonnegative(),
  avgShowPosition: z.number().nonnegative(),
  avgClickPosition: z.number().nonnegative().nullable(),
  previousShows: z.number().nonnegative().nullable(),
  previousClicks: z.number().nonnegative().nullable(),
  deltaClicksPercent: z.number().nullable(),
  deltaCtrPoints: z.number().nullable(),
  opportunityType: z.string().min(1),
});

export const landingPageSchema = z.object({
  path: z.string().min(1),
  visits: z.number().nonnegative(),
  users: z.number().nonnegative(),
  pageviews: z.number().nonnegative(),
  bounceRate: z.number().nonnegative(),
  depth: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  goals: z.number().nonnegative(),
  conversionRate: z.number().nonnegative().nullable(),
  trendLabel: z.string().min(1),
});

export const opportunitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  source: z.enum(["webmaster", "metrica", "combined"]),
  tone: severitySchema,
});

export const alertSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  tone: severitySchema,
});

export const webmasterReportSchema = z.object({
  summary: z.object({
    shows: z.number().nonnegative(),
    clicks: z.number().nonnegative(),
    ctr: z.number().nonnegative(),
    avgPosition: z.number().nonnegative().nullable(),
    pagesInSearch: z.number().nonnegative(),
    excludedPages: z.number().nonnegative(),
    sitemapUrls: z.number().nonnegative(),
    sqi: z.number().nonnegative().nullable(),
  }),
  visibilityTrend: z.array(trendPointSchema).min(1),
  queries: z.array(webmasterQuerySchema),
  diagnostics: z.array(
    z.object({
      severity: severitySchema,
      title: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
  sitemap: z.object({
    url: z.string().url(),
    urls: z.number().nonnegative(),
    errors: z.number().nonnegative(),
  }),
  links: z.object({
    external: z.number().nonnegative(),
    brokenInternal: z.number().nonnegative(),
  }),
});

export const metricaReportSchema = z.object({
  summary: z.object({
    visits: z.number().nonnegative(),
    users: z.number().nonnegative(),
    pageviews: z.number().nonnegative(),
    bounceRate: z.number().nonnegative(),
    depth: z.number().nonnegative(),
    averageVisitDurationSeconds: z.number().nonnegative(),
    goalReaches: z.number().nonnegative(),
    conversionRate: z.number().nonnegative().nullable(),
  }),
  organicTrend: z.array(trendPointSchema).min(1),
  landingPages: z.array(landingPageSchema),
  devices: z.array(
    z.object({
      device: z.string().min(1),
      visits: z.number().nonnegative(),
      conversionRate: z.number().nonnegative().nullable(),
    }),
  ),
  goals: z.array(
    z.object({
      label: z.string().min(1),
      category: z.string().min(1),
      reaches: z.number().nonnegative(),
      conversionRate: z.number().nonnegative().nullable(),
    }),
  ),
});

export const combinedSeoReportSchema = z.object({
  funnel: z.object({
    shows: z.number().nonnegative(),
    clicks: z.number().nonnegative(),
    visits: z.number().nonnegative(),
    goalReaches: z.number().nonnegative(),
    caveats: z.array(z.string().min(1)).min(1),
  }),
  opportunities: z.array(opportunitySchema),
  alerts: z.array(alertSchema),
  methodology: z.array(z.string().min(1)).min(1),
});

export const siteReportSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  clientSlug: z.string().regex(slugPattern),
  siteSlug: z.string().regex(slugPattern),
  siteUrl: z.string().url(),
  generatedAt: isoDateTimeSchema,
  freshness: z.enum(["fresh", "stale", "partial", "unavailable"]),
  sources: z.object({
    webmaster: sourceStateSchema,
    metrica: sourceStateSchema,
  }),
  webmaster: webmasterReportSchema.nullable(),
  metrica: metricaReportSchema.nullable(),
  combined: combinedSeoReportSchema,
});

export const clientSyncResultSchema = z.object({
  clientSlug: z.string().regex(slugPattern),
  status: z.enum(["success", "partial", "failed"]),
  sitesTotal: z.number().int().nonnegative(),
  sitesSucceeded: z.number().int().nonnegative(),
  sitesFailed: z.number().int().nonnegative(),
});

export const syncRunSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().min(1),
  startedAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema.nullable(),
  mode: z.enum(["daily", "weekly", "backfill", "preflight"]),
  status: z.enum(["running", "success", "partial", "failed"]),
  clients: z.array(clientSyncResultSchema),
  safeErrorCodes: z.array(z.string().min(1)),
});

export type TrendPoint = z.infer<typeof trendPointSchema>;
export type SiteReportSnapshot = z.infer<typeof siteReportSnapshotSchema>;
export type SyncRun = z.infer<typeof syncRunSchema>;
export type WebmasterReport = z.infer<typeof webmasterReportSchema>;
export type MetricaReport = z.infer<typeof metricaReportSchema>;
export type CombinedSeoReport = z.infer<typeof combinedSeoReportSchema>;
