import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { createPgPoolConfig } from "./pool-config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const configuredDatabaseUrl = databaseUrl;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
  prismaPool?: Pool;
};

function createPrismaClient() {
  const pool = new Pool(createPgPoolConfig(configuredDatabaseUrl));
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { adapter, pool, prisma };
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma || !globalForPrisma.prismaAdapter || !globalForPrisma.prismaPool) {
    const { adapter, pool, prisma } = createPrismaClient();
    globalForPrisma.prismaAdapter = adapter;
    globalForPrisma.prismaPool = pool;
    globalForPrisma.prisma = prisma;
  }

  return globalForPrisma.prisma;
}
