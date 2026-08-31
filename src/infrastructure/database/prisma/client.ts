import type { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "@prisma/client";
import type { Pool } from "pg";
import { createPrismaContext } from "./context";
import type { PgConnectionEnvironment } from "./pool-config";

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

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
  prismaPool?: Pool;
};

function initializePrismaContext() {
  if (!hasDatabaseUrl()) {
    throw new Error("Database connection is not configured");
  }

  const context = createPrismaContext(databaseEnvironment);
  globalForPrisma.prismaAdapter = context.adapter;
  globalForPrisma.prismaPool = context.pool;
  globalForPrisma.prisma = context.prisma;
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma || !globalForPrisma.prismaAdapter || !globalForPrisma.prismaPool) {
    initializePrismaContext();
  }

  return globalForPrisma.prisma!;
}

export function getPrismaPool() {
  getPrismaClient();
  return globalForPrisma.prismaPool!;
}
