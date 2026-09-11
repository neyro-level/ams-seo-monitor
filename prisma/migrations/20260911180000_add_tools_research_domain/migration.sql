CREATE TYPE "tools"."ProductRole" AS ENUM ('VIEWER', 'OPERATOR', 'ANALYST');
CREATE TYPE "research"."ResearchStatus" AS ENUM ('DRAFT', 'READY', 'RUNNING', 'SUCCEEDED', 'FAILED', 'ARCHIVED');
CREATE TYPE "research"."RunStatus" AS ENUM ('DRAFT', 'AWAITING_CONFIRMATION', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "research"."QueryRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "research"."ExportStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'EXPIRED');

CREATE TABLE "tools"."ToolsOrganization" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "tools"."ToolsProject" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE ("organizationId", "id"),
  UNIQUE ("organizationId", "slug"),
  FOREIGN KEY ("organizationId") REFERENCES "tools"."ToolsOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "tools"."ToolsMembership" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE ("id", "organizationId"),
  UNIQUE ("organizationId", "userId"),
  FOREIGN KEY ("organizationId") REFERENCES "tools"."ToolsOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "tools"."ToolsProjectAccess" (
  "id" TEXT PRIMARY KEY,
  "membershipId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "role" "tools"."ProductRole" NOT NULL DEFAULT 'VIEWER',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("membershipId", "projectId"),
  FOREIGN KEY ("membershipId", "organizationId") REFERENCES "tools"."ToolsMembership"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("organizationId", "projectId") REFERENCES "tools"."ToolsProject"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "research"."Research" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "brief" TEXT NOT NULL DEFAULT '',
  "status" "research"."ResearchStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE ("organizationId", "projectId", "id"),
  FOREIGN KEY ("organizationId", "projectId") REFERENCES "tools"."ToolsProject"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "research"."Query" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "researchId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organizationId", "projectId", "id"),
  UNIQUE ("researchId", "position"),
  FOREIGN KEY ("organizationId", "projectId", "researchId") REFERENCES "research"."Research"("organizationId", "projectId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "research"."Run" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "researchId" TEXT NOT NULL,
  "status" "research"."RunStatus" NOT NULL DEFAULT 'DRAFT',
  "queryCount" INTEGER NOT NULL,
  "estimatedCostKopecks" INTEGER NOT NULL,
  "approvedCostKopecks" INTEGER,
  "actualCostKopecks" INTEGER,
  "idempotencyKey" TEXT NOT NULL,
  "confirmedByUserId" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "safeErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE ("organizationId", "projectId", "id"),
  UNIQUE ("organizationId", "idempotencyKey"),
  FOREIGN KEY ("organizationId", "projectId", "researchId") REFERENCES "research"."Research"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("confirmedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CHECK ("queryCount" BETWEEN 1 AND 20),
  CHECK ("estimatedCostKopecks" >= 0),
  CHECK ("approvedCostKopecks" IS NULL OR "approvedCostKopecks" >= 0),
  CHECK ("actualCostKopecks" IS NULL OR "actualCostKopecks" >= 0)
);

CREATE TABLE "research"."QueryRun" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "queryId" TEXT NOT NULL,
  "status" "research"."QueryRunStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "providerRequestId" TEXT,
  "costKopecks" INTEGER,
  "safeErrorCode" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  UNIQUE ("organizationId", "projectId", "id"),
  FOREIGN KEY ("organizationId", "projectId", "runId") REFERENCES "research"."Run"("organizationId", "projectId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("organizationId", "projectId", "queryId") REFERENCES "research"."Query"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "research"."Evidence" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "queryRunId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "title" TEXT,
  "snippet" TEXT,
  "payload" JSONB NOT NULL,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId", "projectId", "queryRunId") REFERENCES "research"."QueryRun"("organizationId", "projectId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "research"."CompetitorProjection" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "visibilityScore" DOUBLE PRECISION NOT NULL,
  "matchedQueryCount" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  UNIQUE ("runId", "domain"),
  FOREIGN KEY ("organizationId", "projectId", "runId") REFERENCES "research"."Run"("organizationId", "projectId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "research"."Export" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "researchId" TEXT NOT NULL,
  "runId" TEXT,
  "format" TEXT NOT NULL,
  "status" "research"."ExportStatus" NOT NULL DEFAULT 'PENDING',
  "objectKey" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId", "projectId", "researchId") REFERENCES "research"."Research"("organizationId", "projectId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("organizationId", "projectId", "runId") REFERENCES "research"."Run"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX ON "tools"."ToolsProject"("organizationId", "archivedAt");
CREATE INDEX ON "tools"."ToolsProjectAccess"("organizationId", "projectId");
CREATE INDEX ON "research"."Research"("organizationId", "projectId", "updatedAt");
CREATE INDEX ON "research"."Query"("organizationId", "projectId", "researchId");
CREATE INDEX ON "research"."Run"("organizationId", "projectId", "createdAt");
CREATE INDEX ON "research"."QueryRun"("organizationId", "projectId", "runId");
CREATE INDEX ON "research"."Evidence"("organizationId", "projectId", "queryRunId");
CREATE INDEX ON "research"."CompetitorProjection"("organizationId", "projectId", "runId");
CREATE INDEX ON "research"."Export"("organizationId", "projectId", "createdAt");

CREATE OR REPLACE FUNCTION "platform"."can_access_tools_project"(target_organization_id TEXT, target_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, tools, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "public"."User" AS app_user
    WHERE app_user.id = "platform"."current_user_id"()
      AND app_user."disabledAt" IS NULL
      AND (
        app_user."systemRole" = 'PLATFORM_ADMIN'::"public"."SystemRole"
        OR EXISTS (
          SELECT 1
          FROM "tools"."ToolsMembership" AS membership
          JOIN "tools"."ToolsProjectAccess" AS access
            ON access."membershipId" = membership.id
           AND access."organizationId" = membership."organizationId"
          WHERE membership."userId" = app_user.id
            AND access."organizationId" = target_organization_id
            AND access."projectId" = target_project_id
        )
      )
  )
$$;

DO $rls$
DECLARE table_ref REGCLASS;
BEGIN
  FOREACH table_ref IN ARRAY ARRAY[
    'tools."ToolsProjectAccess"'::REGCLASS,
    'research."Research"'::REGCLASS,
    'research."Query"'::REGCLASS,
    'research."Run"'::REGCLASS,
    'research."QueryRun"'::REGCLASS,
    'research."Evidence"'::REGCLASS,
    'research."CompetitorProjection"'::REGCLASS,
    'research."Export"'::REGCLASS
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_ref);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_ref);
    EXECUTE format(
      'CREATE POLICY project_scope ON %s USING (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_tools_project"("organizationId", "projectId")) WITH CHECK (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_tools_project"("organizationId", "projectId"))',
      table_ref
    );
  END LOOP;
END
$rls$;

ALTER TABLE "tools"."ToolsProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tools"."ToolsProject" FORCE ROW LEVEL SECURITY;
CREATE POLICY "project_scope" ON "tools"."ToolsProject"
  USING (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_tools_project"("organizationId", id))
  WITH CHECK (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_tools_project"("organizationId", id));

ALTER TABLE "tools"."ToolsMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tools"."ToolsMembership" FORCE ROW LEVEL SECURITY;
CREATE POLICY "membership_scope" ON "tools"."ToolsMembership"
  USING (
    NOT "platform"."is_restricted_runtime"()
    OR "userId" = "platform"."current_user_id"()
    OR EXISTS (
      SELECT 1 FROM "public"."User" AS app_user
      WHERE app_user.id = "platform"."current_user_id"()
        AND app_user."disabledAt" IS NULL
        AND app_user."systemRole" = 'PLATFORM_ADMIN'::"public"."SystemRole"
    )
  );

ALTER TABLE "tools"."ToolsOrganization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tools"."ToolsOrganization" FORCE ROW LEVEL SECURITY;
CREATE POLICY "organization_scope" ON "tools"."ToolsOrganization"
  USING (
    NOT "platform"."is_restricted_runtime"()
    OR EXISTS (
      SELECT 1 FROM "tools"."ToolsMembership" AS membership
      WHERE membership."organizationId" = "ToolsOrganization".id
        AND membership."userId" = "platform"."current_user_id"()
    )
  );

GRANT EXECUTE ON FUNCTION "platform"."can_access_tools_project"(TEXT, TEXT) TO PUBLIC;
