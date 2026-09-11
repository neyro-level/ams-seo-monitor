import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../prisma/migrations/20260911170000_add_product_schemas_and_rls/migration.sql", import.meta.url),
  "utf8",
);
const roles = readFileSync(new URL("../ops/postgres/roles.sql", import.meta.url), "utf8");

describe("PostgreSQL RLS foundation", () => {
  it("creates every approved product schema", () => {
    for (const schema of ["platform", "seo", "leads", "tools", "research", "contracts", "invoices", "presentations", "site_clone", "ops", "pgboss"]) {
      expect(migration).toContain(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    }
  });

  it("forces RLS and resolves SEO access from current user grants", () => {
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("current_setting('ams.user_id', true)");
    expect(migration).toContain('JOIN "SeoProjectAccess" AS access');
    expect(migration).toContain('app_user."disabledAt" IS NULL');
  });

  it("keeps runtime identities non-owner and unable to bypass RLS", () => {
    expect(roles).toContain("ams_web NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS");
    expect(roles).toContain("ams_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS");
    expect(roles).toContain("ams_migrator NOLOGIN");
    expect(roles).toContain("ams_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS");
  });
});
