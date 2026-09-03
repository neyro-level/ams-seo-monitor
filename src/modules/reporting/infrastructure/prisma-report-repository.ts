
import type {
  ReportRepository,
  StoredReportSnapshotRecord,
} from "../application/ports/report-repository";
import {
  reportPeriodKeySchema,
  siteReportSnapshotSchema,
  type ReportPeriodKey,
} from "../../../shared/schemas/report";
import { getPrismaClient } from "../../../infrastructure/database/prisma/client";

const PRISMA_PERIOD_KEY_BY_APP_PERIOD: Record<ReportPeriodKey, "WEEK" | "MONTH" | "QUARTER" | "HALF_YEAR"> = {
  week: "WEEK",
  month: "MONTH",
  quarter: "QUARTER",
  halfYear: "HALF_YEAR",
};

const APP_PERIOD_KEY_BY_PRISMA_PERIOD = {
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  HALF_YEAR: "halfYear",
} as const satisfies Record<"WEEK" | "MONTH" | "QUARTER" | "HALF_YEAR", ReportPeriodKey>;

const APP_FRESHNESS_BY_PRISMA_FRESHNESS = {
  FRESH: "fresh",
  STALE: "stale",
  PARTIAL: "partial",
  UNAVAILABLE: "unavailable",
} as const;

export class PrismaReportRepository implements ReportRepository {
  async findLatestReportSnapshot(
    siteId: string,
    periodKey: ReportPeriodKey,
  ): Promise<StoredReportSnapshotRecord | null> {
    const report = await getPrismaClient().reportSnapshot.findFirst({
      where: {
        siteId,
        periodKey: PRISMA_PERIOD_KEY_BY_APP_PERIOD[periodKey],
      },
      orderBy: {
        generatedAt: "desc",
      },
      select: {
        siteId: true,
        periodKey: true,
        generatedAt: true,
        freshness: true,
        payload: true,
      },
    });

    if (!report) {
      return null;
    }

    const normalizedPeriodKey = reportPeriodKeySchema.parse(
      APP_PERIOD_KEY_BY_PRISMA_PERIOD[report.periodKey],
    );

    return {
      siteId: report.siteId,
      periodKey: normalizedPeriodKey,
      generatedAt: report.generatedAt.toISOString(),
      freshness: APP_FRESHNESS_BY_PRISMA_FRESHNESS[report.freshness],
      payload: siteReportSnapshotSchema.parse(report.payload),
    };
  }
}
