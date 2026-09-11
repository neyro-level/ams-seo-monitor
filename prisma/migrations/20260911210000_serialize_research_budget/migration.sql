CREATE OR REPLACE FUNCTION "platform"."research_committed_spend"(
  target_organization_id TEXT,
  authorized_project_id TEXT,
  reference_time TIMESTAMPTZ
)
RETURNS TABLE ("dailyKopecks" BIGINT, "monthlyKopecks" BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, tools, research, pg_catalog
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN run."confirmedAt" >= date_trunc('day', reference_time) THEN run."approvedCostKopecks" ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN run."confirmedAt" >= date_trunc('month', reference_time) THEN run."approvedCostKopecks" ELSE 0 END), 0)::BIGINT
  FROM "research"."Run" AS run
  WHERE run."organizationId" = target_organization_id
    AND run."approvedCostKopecks" IS NOT NULL
    AND run."status" IN ('QUEUED', 'RUNNING', 'SUCCEEDED')
    AND "platform"."can_access_tools_project"(target_organization_id, authorized_project_id)
$$;

REVOKE ALL ON FUNCTION "platform"."research_committed_spend"(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "platform"."research_committed_spend"(TEXT, TEXT, TIMESTAMPTZ) TO PUBLIC;
