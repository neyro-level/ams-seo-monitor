import { PgBoss } from "pg-boss";

function readDatabaseOptions(env) {
  if (env.DATABASE_URL?.trim()) {
    return {
      connectionString: env.DATABASE_URL.trim(),
    };
  }
  if (!env.DATABASE_HOST || !env.DATABASE_USER || !env.DATABASE_PASSWORD || !env.DATABASE_NAME) {
    throw new Error("Database environment is invalid or incomplete");
  }
  return {
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT ? Number(env.DATABASE_PORT) : 5432,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: env.DATABASE_SSLMODE === "disable" ? false : undefined,
  };
}

const boss = new PgBoss({
  ...readDatabaseOptions(process.env),
  schema: process.env.PGBOSS_SCHEMA?.trim() || "pgboss",
  max: 1,
  application_name: "seo-monitor-pgboss-migrate",
  migrate: true,
  createSchema: true,
  supervise: false,
  schedule: false,
});

await boss.start();
await boss.stop();
process.stdout.write("pgboss_schema_ready\n");
