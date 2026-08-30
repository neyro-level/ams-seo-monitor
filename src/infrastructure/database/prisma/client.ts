import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  createPgPoolConfigFromEnvironment,
  type PgConnectionEnvironment,
} from "./pool-config";

const databaseEnvironment: PgConnectionEnvironment = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_PORT: process.env.DATABASE_PORT,
  DATABASE_USER: process.env.DATABASE_USER,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
  DATABASE_NAME: process.env.DATABASE_NAME,
  DATABASE_SSLMODE: process.env.DATABASE_SSLMODE,
};

export function hasDatabaseUrl() {
  return Boolean(
    databaseEnvironment.DATABASE_URL ||
      (databaseEnvironment.DATABASE_HOST &&
        databaseEnvironment.DATABASE_USER &&
        databaseEnvironment.DATABASE_PASSWORD &&
        databaseEnvironment.DATABASE_NAME),
  );
}

function createPrismaClient() {
  if (!hasDatabaseUrl()) {
    throw new Error("Database connection is not configured");
  }

  const pool = new Pool(createPgPoolConfigFromEnvironment(databaseEnvironment));
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { adapter, pool, prisma };
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
  prismaPool?: Pool;
};

export function getPrismaClient() {
  if (!globalForPrisma.prisma || !globalForPrisma.prismaAdapter || !globalForPrisma.prismaPool) {
    const { adapter, pool, prisma } = createPrismaClient();
    globalForPrisma.prismaAdapter = adapter;
    globalForPrisma.prismaPool = pool;
    globalForPrisma.prisma = prisma;
  }

  return globalForPrisma.prisma;
}
