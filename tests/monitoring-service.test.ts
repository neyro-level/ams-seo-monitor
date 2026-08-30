import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { MonitoringService } from "../src/application/services/monitoring-service";
import { PrismaMonitoringRepository } from "../src/infrastructure/database/repositories/prisma-monitoring-repository";
import { createPgPoolConfigFromEnvironment } from "../src/infrastructure/database/prisma/pool-config";

const monitoringTestEnabled = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME,
);
const monitoringTestDescription = monitoringTestEnabled ? describe : describe.skip;

let prisma: PrismaClient | null = null;
let pool: Pool | null = null;

monitoringTestDescription("MonitoringService", () => {
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
    await prisma.providerConnection.updateMany({
      where: {
        provider: "TOPVISOR",
      },
      data: {
        enabled: false,
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

  it("reconstructs legacy monitoring context from PostgreSQL", async () => {
    const monitoringService = new MonitoringService(new PrismaMonitoringRepository());
    const context = await monitoringService.getProjectContext("REDACTED_CLIENT_DATA");

    expect(context).not.toBeNull();
    expect(context?.client.clientSlug).toBe("REDACTED_CLIENT_DATA");
    expect(context?.client.sites).toHaveLength(3);
    expect(context?.goalProfile.goals.length).toBeGreaterThan(0);
    expect(context?.trackedQuerySets[0]?.expectedCount).toBe(75);
    expect(context?.clusterProfile.groups[0]?.slug).toBe("brand");
    expect(context?.thresholds.queryOpportunity.minimumShows).toBe(30);
  });
});
