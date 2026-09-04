import type { ReportPeriodKey, SiteReportSnapshot } from "../../../../shared/schemas/report.ts";

export interface CreateSyncRunInput {
  organizationId: string;
  trigger: "daily" | "manual" | "preflight" | "backfill";
  startedAt: string;
}

export interface CreateSourceRunInput {
  syncRunId: string;
  siteId: string;
  provider: "YANDEX_WEBMASTER" | "YANDEX_METRIKA" | "TOPVISOR";
  startedAt: string;
}

export interface FinishSourceRunInput {
  sourceRunId: string;
  status:
    | "success"
    | "partial"
    | "failed"
    | "not_configured"
    | "access_denied"
    | "quota_limited"
    | "stale";
  finishedAt: string;
  durationMs: number | null;
  rowsReceived: number | null;
  safeErrorCode: string | null;
  notes: string | null;
}

export interface FinishSyncRunInput {
  syncRunId: string;
  status: "running" | "success" | "partial" | "failed";
  finishedAt: string;
  sitesProcessed: number;
  safeError: string | null;
}

export interface StoreReportSnapshotInput {
  siteId: string;
  periodKey: ReportPeriodKey;
  snapshot: SiteReportSnapshot;
}

export interface StoreWebmasterDailyMetricRow {
  date: string;
  shows: number;
  clicks: number;
  ctr: number | null;
  averagePosition: number | null;
}

export interface StoreWebmasterQueryMetricRow {
  date: string;
  queryId: string;
  query: string;
  normalizedQuery: string;
  orderBy: "TOTAL_SHOWS" | "TOTAL_CLICKS";
  device: "ALL" | "DESKTOP" | "MOBILE" | "TABLET" | "MOBILE_AND_TABLET";
  shows: number;
  clicks: number;
  ctr: number | null;
  averagePosition: number | null;
  averageClickPosition: number | null;
}

export interface StoreMetrikaDailyMetricRow {
  date: string;
  visits: number;
  users: number | null;
  pageviews: number | null;
  bounceRate: number | null;
  pageDepth: number | null;
  averageVisitDurationSeconds: number | null;
  goalReaches: number;
  uniqueTargetVisits: number;
  uniqueTargetUsers: number | null;
  allVisits: number | null;
  conversionRate: number | null;
}

export interface StoreLandingPageMetricRow {
  date: string;
  path: string;
  visits: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  pageDepth: number;
  averageVisitDurationSeconds: number;
  goalReaches: number;
  targetVisits: number;
  conversionRate: number | null;
}

export interface StoreMetrikaDeviceMetricRow {
  date: string;
  device: string;
  visits: number;
  users: number;
  goalReaches: number;
  conversionRate: number | null;
}

export interface StoreMetrikaGoalMetricRow {
  date: string;
  externalGoalId: string;
  name: string;
  category:
    | "LEAD_SUBMIT"
    | "PHONE_CLICK"
    | "MESSENGER_CLICK"
    | "FORM_START"
    | "FILE_DOWNLOAD"
    | "OTHER";
  direction: "PRIMARY" | "SECONDARY";
  reaches: number;
  visits: number;
  users: number;
  conversionRate: number | null;
}

export interface StoreRankingCaptureRow {
  trackedQueryId: string;
  capturedAt: string;
  position: number | null;
  source: "OWNER_PROVIDED" | "TOPVISOR";
}

export interface StoreTechnicalSnapshotRow {
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
}

export interface StoreWebmasterDailyMetricsInput {
  siteId: string;
  sourceRunId: string;
  rows: StoreWebmasterDailyMetricRow[];
}

export interface StoreWebmasterQueryMetricsInput {
  siteId: string;
  sourceRunId: string;
  periodKey: ReportPeriodKey;
  rows: StoreWebmasterQueryMetricRow[];
}

export interface StoreMetrikaDailyMetricsInput {
  siteId: string;
  sourceRunId: string;
  rows: StoreMetrikaDailyMetricRow[];
}

export interface StoreLandingPageMetricsInput {
  siteId: string;
  sourceRunId: string;
  periodKey: ReportPeriodKey;
  rows: StoreLandingPageMetricRow[];
}

export interface StoreMetrikaDeviceMetricsInput {
  siteId: string;
  sourceRunId: string;
  periodKey: ReportPeriodKey;
  rows: StoreMetrikaDeviceMetricRow[];
}

export interface StoreMetrikaGoalMetricsInput {
  siteId: string;
  sourceRunId: string;
  periodKey: ReportPeriodKey;
  rows: StoreMetrikaGoalMetricRow[];
}

export interface StoreRankingCapturesInput {
  sourceRunId: string | null;
  rows: StoreRankingCaptureRow[];
}

export interface StoreTechnicalSnapshotsInput {
  siteId: string;
  sourceRunId: string;
  rows: StoreTechnicalSnapshotRow[];
}

export interface StoredRunRecord {
  syncRunId: string;
}

export interface StoredSourceRunRecord {
  sourceRunId: string;
}

export interface StoredTrackedQueryRecord {
  trackedQueryId: string;
  normalizedQuery: string;
}

export interface StoredTrackedQuerySetRecord {
  siteId: string;
  rows: StoredTrackedQueryRecord[];
}

export interface SyncLockHandle {
  release(): Promise<void>;
}

export interface SyncRepository {
  tryAcquireFullSyncLock(scope: string): Promise<SyncLockHandle | null>;
  createSyncRun(input: CreateSyncRunInput): Promise<StoredRunRecord>;
  createSourceRun(input: CreateSourceRunInput): Promise<StoredSourceRunRecord>;
  finishSourceRun(input: FinishSourceRunInput): Promise<void>;
  finishSyncRun(input: FinishSyncRunInput): Promise<void>;
  storeReportSnapshot(input: StoreReportSnapshotInput): Promise<void>;
  storeWebmasterDailyMetrics(input: StoreWebmasterDailyMetricsInput): Promise<void>;
  storeWebmasterQueryMetrics(input: StoreWebmasterQueryMetricsInput): Promise<void>;
  storeMetrikaDailyMetrics(input: StoreMetrikaDailyMetricsInput): Promise<void>;
  storeLandingPageMetrics(input: StoreLandingPageMetricsInput): Promise<void>;
  storeMetrikaDeviceMetrics(input: StoreMetrikaDeviceMetricsInput): Promise<void>;
  storeMetrikaGoalMetrics(input: StoreMetrikaGoalMetricsInput): Promise<void>;
  storeRankingCaptures(input: StoreRankingCapturesInput): Promise<void>;
  storeTechnicalSnapshots(input: StoreTechnicalSnapshotsInput): Promise<void>;
  listTrackedQueriesForSite(siteId: string): Promise<StoredTrackedQuerySetRecord>;
}
