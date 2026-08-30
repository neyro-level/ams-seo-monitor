import type { ReportPeriodKey, SiteReportSnapshot } from "../../shared/schemas/report";

export interface StoredReportSnapshotRecord {
  siteId: string;
  periodKey: ReportPeriodKey;
  generatedAt: string;
  freshness: "fresh" | "stale" | "partial" | "unavailable";
  payload: SiteReportSnapshot;
}

export interface ReportRepository {
  findLatestReportSnapshot(
    siteId: string,
    periodKey: ReportPeriodKey,
  ): Promise<StoredReportSnapshotRecord | null>;
}
