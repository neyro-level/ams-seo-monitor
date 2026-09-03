import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { createPgPoolConfigFromEnvironment } from "./pool-config";
import type { DatabaseEnvironment } from "../../../platform/config/server-environment";

export function createPrismaContext(environment: DatabaseEnvironment) {
  const pool = new Pool(createPgPoolConfigFromEnvironment(environment));
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return {
    adapter,
    pool,
    prisma,
    async close() {
      await prisma.$disconnect();
      await pool.end();
    },
  };
}
