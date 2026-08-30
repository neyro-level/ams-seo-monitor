import type { PoolConfig } from "pg";

export interface PgConnectionEnvironment {
  DATABASE_URL?: string;
  DATABASE_HOST?: string;
  DATABASE_PORT?: string;
  DATABASE_USER?: string;
  DATABASE_PASSWORD?: string;
  DATABASE_NAME?: string;
  DATABASE_SSLMODE?: string;
}

export function createPgPoolConfig(databaseUrl: string): PoolConfig {
  const parsed = new URL(databaseUrl);
  const database = parsed.pathname.replace(/^\//, "");

  return {
    host: parsed.hostname,
    port: parsed.port.length > 0 ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl: parsed.searchParams.get("sslmode") === "disable" ? false : undefined,
  };
}

export function createPgPoolConfigFromEnvironment(env: PgConnectionEnvironment): PoolConfig {
  if (env.DATABASE_HOST && env.DATABASE_USER && env.DATABASE_PASSWORD && env.DATABASE_NAME) {
    return {
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT ? Number(env.DATABASE_PORT) : 5432,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      ssl: env.DATABASE_SSLMODE === "disable" ? false : undefined,
    };
  }

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  return createPgPoolConfig(env.DATABASE_URL);
}
