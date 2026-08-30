import type { ReportPeriodKey, SiteReportSnapshot } from "../../shared/schemas/report";

export interface CreateSyncRunInput {
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

export interface StoredRunRecord {
  syncRunId: string;
}

export interface StoredSourceRunRecord {
  sourceRunId: string;
}

export interface SyncRepository {
  createSyncRun(input: CreateSyncRunInput): Promise<StoredRunRecord>;
  createSourceRun(input: CreateSourceRunInput): Promise<StoredSourceRunRecord>;
  finishSourceRun(input: FinishSourceRunInput): Promise<void>;
  finishSyncRun(input: FinishSyncRunInput): Promise<void>;
  storeReportSnapshot(input: StoreReportSnapshotInput): Promise<void>;
}
