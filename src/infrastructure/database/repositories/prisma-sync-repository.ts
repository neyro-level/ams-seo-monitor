import "server-only";

import {
  ReportFreshness,
  ReportPeriodKey,
  SourceStatus,
  SyncRunStatus,
  SyncTrigger,
} from "@prisma/client";
import type {
  CreateSourceRunInput,
  CreateSyncRunInput,
  FinishSourceRunInput,
  FinishSyncRunInput,
  StoreReportSnapshotInput,
  StoredRunRecord,
  StoredSourceRunRecord,
  SyncRepository,
} from "../../../application/ports/sync-repository";
import { getPrismaClient } from "../prisma/client";

const PRISMA_TRIGGER_BY_APP_TRIGGER = {
  daily: SyncTrigger.DAILY,
  manual: SyncTrigger.MANUAL,
  preflight: SyncTrigger.PREFLIGHT,
  backfill: SyncTrigger.BACKFILL,
} as const;

const PRISMA_STATUS_BY_APP_STATUS = {
  running: SyncRunStatus.RUNNING,
  success: SyncRunStatus.SUCCESS,
  partial: SyncRunStatus.PARTIAL,
  failed: SyncRunStatus.FAILED,
} as const;

const PRISMA_SOURCE_STATUS_BY_APP_STATUS = {
  success: SourceStatus.SUCCESS,
  partial: SourceStatus.PARTIAL,
  failed: SourceStatus.FAILED,
  not_configured: SourceStatus.NOT_CONFIGURED,
  access_denied: SourceStatus.ACCESS_DENIED,
  quota_limited: SourceStatus.QUOTA_LIMITED,
  stale: SourceStatus.STALE,
} as const;

const PRISMA_REPORT_PERIOD_BY_APP_PERIOD = {
  week: ReportPeriodKey.WEEK,
  month: ReportPeriodKey.MONTH,
  quarter: ReportPeriodKey.QUARTER,
  halfYear: ReportPeriodKey.HALF_YEAR,
} as const;

const PRISMA_REPORT_FRESHNESS_BY_APP_FRESHNESS = {
  fresh: ReportFreshness.FRESH,
  stale: ReportFreshness.STALE,
  partial: ReportFreshness.PARTIAL,
  unavailable: ReportFreshness.UNAVAILABLE,
} as const;

export class PrismaSyncRepository implements SyncRepository {
  async createSyncRun(input: CreateSyncRunInput): Promise<StoredRunRecord> {
    const syncRun = await getPrismaClient().syncRun.create({
      data: {
        trigger: PRISMA_TRIGGER_BY_APP_TRIGGER[input.trigger],
        status: SyncRunStatus.RUNNING,
        startedAt: new Date(input.startedAt),
      },
      select: {
        id: true,
      },
    });

    return { syncRunId: syncRun.id };
  }

  async createSourceRun(input: CreateSourceRunInput): Promise<StoredSourceRunRecord> {
    const sourceRun = await getPrismaClient().sourceRun.create({
      data: {
        syncRunId: input.syncRunId,
        siteId: input.siteId,
        provider: input.provider,
        status: SourceStatus.FAILED,
        startedAt: new Date(input.startedAt),
      },
      select: {
        id: true,
      },
    });

    return { sourceRunId: sourceRun.id };
  }

  async finishSourceRun(input: FinishSourceRunInput): Promise<void> {
    await getPrismaClient().sourceRun.update({
      where: { id: input.sourceRunId },
      data: {
        status: PRISMA_SOURCE_STATUS_BY_APP_STATUS[input.status],
        finishedAt: new Date(input.finishedAt),
        durationMs: input.durationMs,
        rowsReceived: input.rowsReceived,
        safeErrorCode: input.safeErrorCode,
        notes: input.notes,
      },
    });
  }

  async finishSyncRun(input: FinishSyncRunInput): Promise<void> {
    await getPrismaClient().syncRun.update({
      where: { id: input.syncRunId },
      data: {
        status: PRISMA_STATUS_BY_APP_STATUS[input.status],
        finishedAt: new Date(input.finishedAt),
        sitesProcessed: input.sitesProcessed,
        safeError: input.safeError,
      },
    });
  }

  async storeReportSnapshot(input: StoreReportSnapshotInput): Promise<void> {
    await getPrismaClient().reportSnapshot.create({
      data: {
        siteId: input.siteId,
        periodKey: PRISMA_REPORT_PERIOD_BY_APP_PERIOD[input.periodKey],
        schemaVersion: input.snapshot.schemaVersion,
        generatedAt: new Date(input.snapshot.generatedAt),
        freshness: PRISMA_REPORT_FRESHNESS_BY_APP_FRESHNESS[input.snapshot.freshness],
        payload: input.snapshot,
      },
    });
  }
}
