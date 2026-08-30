import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaSyncRepository } from "../src/infrastructure/database/repositories/prisma-sync-repository";
import { createPgPoolConfigFromEnvironment } from "../src/infrastructure/database/prisma/pool-config";
import { siteReportSnapshotSchema } from "../src/shared/schemas/report";

const syncRepositoryTestEnabled = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME,
);
const syncRepositoryTestDescription = syncRepositoryTestEnabled ? describe : describe.skip;

let prisma: PrismaClient | null = null;
let pool: Pool | null = null;

syncRepositoryTestDescription("PrismaSyncRepository", () => {
  beforeAll(async () => {
    pool = new Pool(
      createPgPoolConfigFromEnvironment({
        DATABASE_HOST: process.env.DATABASE_HOST,
        DATABASE_PORT: process.env.DATABASE_PORT,
        DATABASE_USER: process.env.DATABASE_USER,
        DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
        DATABASE_NAME: process.env.DATABASE_NAME,
        DATABASE_SSLMODE: process.env.DATABASE_SSLMODE,
      }),
    );
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  });

  it("persists sync runs, source runs and report snapshots", async () => {
    const repository = new PrismaSyncRepository();
    const site = await prisma!.site.findFirstOrThrow({
      where: {
        slug: "REDACTED_CLIENT_DATA",
        project: { slug: "REDACTED_CLIENT_DATA" },
      },
      select: { id: true },
    });

    const syncRun = await repository.createSyncRun({
      trigger: "manual",
      startedAt: "2026-08-30T00:00:00+03:00",
    });
    const sourceRun = await repository.createSourceRun({
      syncRunId: syncRun.syncRunId,
      siteId: site.id,
      provider: "YANDEX_WEBMASTER",
      startedAt: "2026-08-30T00:00:00+03:00",
    });

    const snapshot = siteReportSnapshotSchema.parse({
      schemaVersion: 1,
      clientSlug: "REDACTED_CLIENT_DATA",
      siteSlug: "REDACTED_CLIENT_DATA",
      siteUrl: "https://REDACTED_CLIENT_DATA",
      generatedAt: "2026-08-30T00:00:00+03:00",
      freshness: "partial",
      periodKey: "week",
      sources: {
        webmaster: {
          status: "success",
          fetchedAt: "2026-08-30T00:00:00+03:00",
          periodStart: "2026-08-24",
          periodEnd: "2026-08-30",
          timezone: "+03:00",
          note: null,
          safeErrorCode: null,
        },
        metrica: {
          status: "failed",
          fetchedAt: "2026-08-30T00:00:00+03:00",
          periodStart: "2026-08-24",
          periodEnd: "2026-08-30",
          timezone: "+03:00",
          note: null,
          safeErrorCode: "UNAUTHORIZED",
        },
      },
      webmaster: null,
      metrica: null,
      ranking: null,
      comparison: null,
      combined: {
        funnel: {
          shows: 0,
          clicks: 0,
          visits: 0,
          goalReaches: 0,
          caveats: ["sync-test"],
        },
        opportunities: [],
        alerts: [],
        methodology: ["sync-test"],
      },
    });

    await repository.storeReportSnapshot({
      siteId: site.id,
      periodKey: "week",
      snapshot,
    });
    await repository.finishSourceRun({
      sourceRunId: sourceRun.sourceRunId,
      status: "partial",
      finishedAt: "2026-08-30T00:05:00+03:00",
      durationMs: 300000,
      rowsReceived: 10,
      safeErrorCode: "UNAUTHORIZED",
      notes: "metrica failure",
    });
    await repository.finishSyncRun({
      syncRunId: syncRun.syncRunId,
      status: "partial",
      finishedAt: "2026-08-30T00:05:00+03:00",
      sitesProcessed: 1,
      safeError: "UNAUTHORIZED",
    });

    const storedSyncRun = await prisma!.syncRun.findUniqueOrThrow({
      where: { id: syncRun.syncRunId },
      select: { status: true, sitesProcessed: true },
    });
    const storedSourceRun = await prisma!.sourceRun.findUniqueOrThrow({
      where: { id: sourceRun.sourceRunId },
      select: { status: true, safeErrorCode: true },
    });
    const storedReport = await prisma!.reportSnapshot.findFirstOrThrow({
      where: {
        siteId: site.id,
        periodKey: "WEEK",
        generatedAt: new Date("2026-08-30T00:00:00+03:00"),
      },
      select: { freshness: true, schemaVersion: true },
    });

    expect(storedSyncRun.status).toBe("PARTIAL");
    expect(storedSyncRun.sitesProcessed).toBe(1);
    expect(storedSourceRun.status).toBe("PARTIAL");
    expect(storedSourceRun.safeErrorCode).toBe("UNAUTHORIZED");
    expect(storedReport.freshness).toBe("PARTIAL");
    expect(storedReport.schemaVersion).toBe(1);
  });
});
