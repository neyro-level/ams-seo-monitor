import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { syncProjectToDatabase } from "../src/worker/sync-project";
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

    await prisma.reportSnapshot.deleteMany();
    await prisma.sourceRun.deleteMany();
    await prisma.syncRun.deleteMany();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  });

  it("persists one project sync into PostgreSQL report snapshots", async () => {
    const result = await syncProjectToDatabase({
      projectSlug: "REDACTED_CLIENT_DATA",
      now: () => "2026-08-30T00:00:00+03:00",
      collectors: {
        webmaster: async (site) => createWebmasterSourceFixture(site),
        metrica: async (site) => createMetricaSourceFixture(site),
      },
    });

    expect(result.projectSlug).toBe("REDACTED_CLIENT_DATA");
    expect(result.status).toBe("success");
    expect(result.sites).toHaveLength(3);
    expect(result.sites[0]?.periods).toHaveLength(4);

    const syncRunCount = await prisma!.syncRun.count();
    const sourceRunCount = await prisma!.sourceRun.count();
    const reportSnapshotCount = await prisma!.reportSnapshot.count();

    expect(syncRunCount).toBe(1);
    expect(sourceRunCount).toBe(6);
    expect(reportSnapshotCount).toBe(12);
  });
});
