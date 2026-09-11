import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../prisma/migrations/20260911180000_add_tools_research_domain/migration.sql", import.meta.url), "utf8");

describe("Tools and Research database contract", () => {
  it("uses independent membership and explicit project grants", () => {
    expect(sql).toContain('CREATE TABLE "tools"."ToolsMembership"');
    expect(sql).toContain('CREATE TABLE "tools"."ToolsProjectAccess"');
    expect(sql).toContain('UNIQUE ("membershipId", "projectId")');
  });

  it("prevents cross-project research relations with composite foreign keys", () => {
    expect(sql).toContain('FOREIGN KEY ("organizationId", "projectId", "researchId")');
    expect(sql).toContain('FOREIGN KEY ("organizationId", "projectId", "runId")');
    expect(sql).toContain('FOREIGN KEY ("organizationId", "projectId", "queryRunId")');
  });

  it("forces RLS and caps every run at twenty queries", () => {
    expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain('CHECK ("queryCount" BETWEEN 1 AND 20)');
    expect(sql).toContain('"platform"."can_access_tools_project"');
  });

  it("scopes ToolsProject by its own id rather than a nonexistent projectId", () => {
    expect(sql).toContain('ON "tools"."ToolsProject"');
    expect(sql).toContain('"can_access_tools_project"("organizationId", id)');
    expect(sql).not.toContain(`'tools."ToolsProject"'::REGCLASS`);
  });
});
