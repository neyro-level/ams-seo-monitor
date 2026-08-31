import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  createPgPoolConfigFromEnvironment,
  type PgConnectionEnvironment,
} from "./pool-config";

export function createPrismaContext(environment: PgConnectionEnvironment) {
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
