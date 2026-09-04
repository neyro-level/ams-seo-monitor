import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Provider } from "../src/generated/prisma/client.ts"
import { Pool } from "pg";
import { syncProjectToDatabase } from "../src/modules/data-ingestion/worker.ts";
import { topvisorSiteDataSchema } from "../src/shared/schemas/rank-source.ts";
import type { MetricaSiteAudit } from "../src/shared/schemas/metrica-source.ts";
import { createPgPoolConfigFromEnvironment } from "../src/platform/database/prisma/pool-config.ts";
import {
  createMetricaSourceFixture,
  createWebmasterSourceFixture,
} from "./helpers/source-dto-fixtures.ts";

const workerTestEnabled = Boolean(
  process.env.TEST_DATABASE_HOST &&
    process.env.TEST_DATABASE_USER &&
    process.env.TEST_DATABASE_PASSWORD &&
    process.env.TEST_DATABASE_NAME,
);
const workerTestDescription = workerTestEnabled ? describe : describe.skip;

let prisma: PrismaClient | null = null;
let pool: Pool | null = null;

workerTestDescription("syncProjectToDatabase", () => {
  beforeAll(async () => {
    pool = new Pool(
      createPgPoolConfigFromEnvironment({
        DATABASE_HOST: process.env.TEST_DATABASE_HOST,
        DATABASE_PORT: process.env.TEST_DATABASE_PORT,
        DATABASE_USER: process.env.TEST_DATABASE_USER,
        DATABASE_PASSWORD: process.env.TEST_DATABASE_PASSWORD,
        DATABASE_NAME: process.env.TEST_DATABASE_NAME,
        DATABASE_SSLMODE: process.env.TEST_DATABASE_SSLMODE,
      }),
    );
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    await prisma.rankingCapture.deleteMany();
    await prisma.technicalSnapshot.deleteMany();
    await prisma.metrikaGoalDailyMetric.deleteMany();
    await prisma.metrikaDeviceDailyMetric.deleteMany();
    await prisma.landingPageDailyMetric.deleteMany();
    await prisma.metrikaDailyMetric.deleteMany();
    await prisma.webmasterQueryDailyMetric.deleteMany();
    await prisma.webmasterDailyMetric.deleteMany();
    await prisma.reportSnapshot.deleteMany();
    await prisma.sourceRun.deleteMany();
    await prisma.syncRun.deleteMany();
    await prisma.providerConnection.updateMany({
      where: {
        provider: Provider.TOPVISOR,
      },
      data: {
        enabled: false,
      },
    });
    await prisma.providerConnection.updateMany({
      where: {
        provider: Provider.TOPVISOR,
        site: {
          slug: "REDACTED_CLIENT_DATA",
          project: {
            slug: "REDACTED_CLIENT_DATA",
          },
        },
      },
      data: {
        enabled: true,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  });

  it(
    "persists one project sync into PostgreSQL report snapshots and history",
    async () => {
      let clockCalls = 0;
      const now = () =>
        clockCalls++ === 0
          ? "2026-08-30T00:00:00+03:00"
          : "2026-08-30T00:01:00+03:00";
      const result = await syncProjectToDatabase({
        projectSlug: "REDACTED_CLIENT_DATA",
        trigger: "daily",
        now,
        collectors: {
          webmaster: async (site) => createWebmasterSourceFixture(site),
          metrica: async (site) => {
            const fixture = createMetricaSourceFixture(site);
            return {
              ...fixture,
              yandexOrganic: {
                ...fixture.yandexOrganic,
                landingPages: [
                  {
                    path: "/kvartiry/",
                    visits: 40,
                    users: 35,
                    pageviews: 90,
                    bounceRate: 15,
                    pageDepth: 2.25,
                    averageVisitDurationSeconds: 160,
                    goalReaches: 3,
                    targetVisits: 2,
                    conversionRate: 5,
                  },
                ],
                devices: [
                  {
                    device: "desktop",
                    visits: 60,
                    users: 50,
                    goalReaches: 3,
                    conversionRate: null,
                  },
                ],
              },
              goalsSummary: {
                ...fixture.goalsSummary,
                items: [
                  {
                    goalId: "REDACTED_CLIENT_DATA",
                    name: "Отправка формы",
                    category: "lead_submit",
                    direction: "primary",
                    reaches: 5,
                    visits: 4,
                    users: 4,
                    conversionRate: 4,
                  },
                ],
              },
            };
          },
          topvisor: async () =>
            topvisorSiteDataSchema.parse({
              schemaVersion: 1,
              fetchedAt: "2026-08-30T00:00:00+03:00",
              projectId: REDACTED_CLIENT_DATA,
              regionIndex: 0,
              snapshots: [
                {
                  capturedAt: "2026-08-23",
                  queries: [
                    { query: "агентство недвижимости REDACTED_CLIENT_DATA", position: 5 },
                    { query: "REDACTED_CLIENT_DATA недвижимость REDACTED_CLIENT_DATA", position: 2 },
                  ],
                },
              ],
            }),
        },
      });

      expect(result.projectSlug).toBe("REDACTED_CLIENT_DATA");
      expect(result.status).toBe("success");
      expect(result.sites).toHaveLength(3);
      expect(result.sites[0]?.periods).toHaveLength(4);

      const [
        syncRunCount,
        sourceRunCount,
        reportSnapshotCount,
        webmasterDailyMetricCount,
        webmasterQueryMetricCount,
        metrikaDailyMetricCount,
        landingPageMetricCount,
        metrikaDeviceMetricCount,
        metrikaGoalMetricCount,
        rankingCaptureCount,
        technicalSnapshotCount,
      ] = await Promise.all([
        prisma!.syncRun.count(),
        prisma!.sourceRun.count(),
        prisma!.reportSnapshot.count(),
        prisma!.webmasterDailyMetric.count(),
        prisma!.webmasterQueryDailyMetric.count(),
        prisma!.metrikaDailyMetric.count(),
        prisma!.landingPageDailyMetric.count(),
        prisma!.metrikaDeviceDailyMetric.count(),
        prisma!.metrikaGoalDailyMetric.count(),
        prisma!.rankingCapture.count(),
        prisma!.technicalSnapshot.count(),
      ]);

      expect(syncRunCount).toBe(1);
      expect(sourceRunCount).toBe(7);
      expect(reportSnapshotCount).toBe(12);
      expect(webmasterDailyMetricCount).toBeGreaterThan(0);
      expect(webmasterQueryMetricCount).toBeGreaterThan(0);
      expect(metrikaDailyMetricCount).toBeGreaterThan(0);
      expect(landingPageMetricCount).toBeGreaterThan(0);
      expect(metrikaDeviceMetricCount).toBeGreaterThan(0);
      expect(metrikaGoalMetricCount).toBeGreaterThan(0);
      expect(rankingCaptureCount).toBeGreaterThan(0);
      expect(technicalSnapshotCount).toBeGreaterThan(0);
      expect(result.syncRunId).toBeTruthy();
      const storedSyncRun = await prisma!.syncRun.findUniqueOrThrow({
        where: { id: result.syncRunId },
        select: { trigger: true, status: true, startedAt: true, finishedAt: true },
      });
      const unfinishedSourceRuns = await prisma!.sourceRun.count({
        where: {
          syncRunId: result.syncRunId,
          OR: [{ finishedAt: null }, { durationMs: null }],
        },
      });
      expect(storedSyncRun).toMatchObject({
        trigger: "DAILY",
        status: "SUCCESS",
        startedAt: new Date("2026-08-30T00:00:00+03:00"),
        finishedAt: new Date("2026-08-30T00:01:00+03:00"),
      });
      expect(unfinishedSourceRuns).toBe(0);
    },
    15000,
  );

  it(
    "finalizes sync and source runs when report compilation throws",
    async () => {
      const startedAt = "2026-08-31T00:00:00+03:00";
      await expect(
        syncProjectToDatabase({
          projectSlug: "REDACTED_CLIENT_DATA",
          trigger: "manual",
          now: () => startedAt,
          collectors: {
            webmaster: async (site) => createWebmasterSourceFixture(site),
            metrica: async () => ({ invalid: true }) as unknown as MetricaSiteAudit,
            topvisor: async () =>
              topvisorSiteDataSchema.parse({
                schemaVersion: 1,
                fetchedAt: startedAt,
                projectId: REDACTED_CLIENT_DATA,
                regionIndex: 0,
                snapshots: [],
              }),
          },
        }),
      ).rejects.toThrow();

      const failedRun = await prisma!.syncRun.findFirstOrThrow({
        where: { startedAt: new Date(startedAt) },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, finishedAt: true },
      });
      const unfinishedSources = await prisma!.sourceRun.count({
        where: {
          syncRunId: failedRun.id,
          OR: [{ status: { not: "FAILED" } }, { finishedAt: null }],
        },
      });
      expect(failedRun.status).toBe("FAILED");
      expect(failedRun.finishedAt).not.toBeNull();
      expect(unfinishedSources).toBe(0);
    },
    15000,
  );
});
