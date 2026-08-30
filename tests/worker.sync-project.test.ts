import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Provider } from "@prisma/client";
import { Pool } from "pg";
import { syncProjectToDatabase } from "../src/worker/sync-project";
import { topvisorSiteDataSchema } from "../src/shared/schemas/rank-source";
import { createPgPoolConfigFromEnvironment } from "../src/infrastructure/database/prisma/pool-config";
import {
  createMetricaSourceFixture,
  createWebmasterSourceFixture,
} from "./helpers/source-dto-fixtures";

const workerTestEnabled = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME,
);
const workerTestDescription = workerTestEnabled ? describe : describe.skip;

let prisma: PrismaClient | null = null;
let pool: Pool | null = null;

workerTestDescription("syncProjectToDatabase", () => {
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
      const result = await syncProjectToDatabase({
        projectSlug: "REDACTED_CLIENT_DATA",
        now: () => "2026-08-30T00:00:00+03:00",
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
    },
    15000,
  );
});
