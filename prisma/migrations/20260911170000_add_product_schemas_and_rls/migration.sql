CREATE SCHEMA IF NOT EXISTS "platform";
CREATE SCHEMA IF NOT EXISTS "seo";
CREATE SCHEMA IF NOT EXISTS "leads";
CREATE SCHEMA IF NOT EXISTS "tools";
CREATE SCHEMA IF NOT EXISTS "research";
CREATE SCHEMA IF NOT EXISTS "contracts";
CREATE SCHEMA IF NOT EXISTS "invoices";
CREATE SCHEMA IF NOT EXISTS "presentations";
CREATE SCHEMA IF NOT EXISTS "site_clone";
CREATE SCHEMA IF NOT EXISTS "ops";
CREATE SCHEMA IF NOT EXISTS "pgboss";

CREATE OR REPLACE FUNCTION "platform"."current_user_id"()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('ams.user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION "platform"."is_restricted_runtime"()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT current_user IN ('ams_web', 'ams_worker')
$$;

CREATE OR REPLACE FUNCTION "platform"."can_access_seo_project"(
  target_organization_id TEXT,
  target_project_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "User" AS app_user
    WHERE app_user.id = "platform"."current_user_id"()
      AND app_user."disabledAt" IS NULL
      AND (
        app_user."systemRole" = 'PLATFORM_ADMIN'::"SystemRole"
        OR EXISTS (
          SELECT 1
          FROM "Member" AS membership
          JOIN "SeoProjectAccess" AS access
            ON access."membershipId" = membership.id
           AND access."organizationId" = membership."organizationId"
          WHERE membership."userId" = app_user.id
            AND access."organizationId" = target_organization_id
            AND access."projectId" = target_project_id
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION "platform"."can_access_seo_site"(
  target_organization_id TEXT,
  target_site_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "Site" AS site
    WHERE site.id = target_site_id
      AND site."organizationId" = target_organization_id
      AND "platform"."can_access_seo_project"(site."organizationId", site."projectId")
  )
$$;

REVOKE ALL ON FUNCTION "platform"."current_user_id"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "platform"."is_restricted_runtime"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "platform"."can_access_seo_project"(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION "platform"."can_access_seo_site"(TEXT, TEXT) FROM PUBLIC;

DO $rls$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Project', 'SeoProjectAccess', 'Site', 'ProviderOperation', 'ProviderConnection',
    'SearchTarget', 'GoalDefinition', 'GoalDefinitionSite', 'TrackedQuerySet',
    'TrackedQuery', 'SourceRun', 'WebmasterDailyMetric', 'WebmasterQueryDailyMetric',
    'MetrikaDailyMetric', 'LandingPageDailyMetric', 'MetrikaDeviceDailyMetric',
    'MetrikaGoalDailyMetric', 'MetrikaSearchEngineDailyMetric',
    'MetrikaSearchPhraseDailyMetric', 'MetrikaGeoDailyMetric', 'RankingCapture',
    'CompetitorSnapshot', 'Notification', 'TechnicalSnapshot', 'ReportSnapshot'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$rls$;

CREATE POLICY "project_scope" ON "Project"
  USING (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_project"("organizationId", id))
  WITH CHECK (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_project"("organizationId", id));

CREATE POLICY "project_access_scope" ON "SeoProjectAccess"
  USING (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_project"("organizationId", "projectId"))
  WITH CHECK (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_project"("organizationId", "projectId"));

CREATE POLICY "site_scope" ON "Site"
  USING (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_project"("organizationId", "projectId"))
  WITH CHECK (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_project"("organizationId", "projectId"));

DO $site_policies$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ProviderOperation', 'ProviderConnection', 'SearchTarget', 'GoalDefinitionSite',
    'TrackedQuerySet', 'SourceRun', 'WebmasterDailyMetric', 'WebmasterQueryDailyMetric',
    'MetrikaDailyMetric', 'LandingPageDailyMetric', 'MetrikaDeviceDailyMetric',
    'MetrikaGoalDailyMetric', 'MetrikaSearchEngineDailyMetric',
    'MetrikaSearchPhraseDailyMetric', 'MetrikaGeoDailyMetric', 'CompetitorSnapshot',
    'TechnicalSnapshot', 'ReportSnapshot'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY site_scope ON %I USING (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_site"("organizationId", "siteId")) WITH CHECK (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_site"("organizationId", "siteId"))',
      table_name
    );
  END LOOP;
END
$site_policies$;

CREATE POLICY "goal_scope" ON "GoalDefinition"
  USING (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_project"("organizationId", "projectId"))
  WITH CHECK (NOT "platform"."is_restricted_runtime"() OR "platform"."can_access_seo_project"("organizationId", "projectId"));

CREATE POLICY "tracked_query_scope" ON "TrackedQuery"
  USING (
    NOT "platform"."is_restricted_runtime"()
    OR EXISTS (
      SELECT 1 FROM "TrackedQuerySet" AS query_set
      WHERE query_set.id = "TrackedQuery"."trackedQuerySetId"
        AND query_set."organizationId" = "TrackedQuery"."organizationId"
    )
  )
  WITH CHECK (
    NOT "platform"."is_restricted_runtime"()
    OR EXISTS (
      SELECT 1 FROM "TrackedQuerySet" AS query_set
      WHERE query_set.id = "TrackedQuery"."trackedQuerySetId"
        AND query_set."organizationId" = "TrackedQuery"."organizationId"
    )
  );

CREATE POLICY "ranking_scope" ON "RankingCapture"
  USING (
    NOT "platform"."is_restricted_runtime"()
    OR EXISTS (
      SELECT 1
      FROM "TrackedQuery" AS query
      JOIN "TrackedQuerySet" AS query_set ON query_set.id = query."trackedQuerySetId"
      WHERE query.id = "RankingCapture"."trackedQueryId"
        AND query."organizationId" = "RankingCapture"."organizationId"
    )
  )
  WITH CHECK (
    NOT "platform"."is_restricted_runtime"()
    OR EXISTS (
      SELECT 1
      FROM "TrackedQuery" AS query
      JOIN "TrackedQuerySet" AS query_set ON query_set.id = query."trackedQuerySetId"
      WHERE query.id = "RankingCapture"."trackedQueryId"
        AND query."organizationId" = "RankingCapture"."organizationId"
    )
  );

CREATE POLICY "notification_scope" ON "Notification"
  USING (
    NOT "platform"."is_restricted_runtime"()
    OR (
      "projectId" IS NOT NULL
      AND "platform"."can_access_seo_project"("organizationId", "projectId")
    )
  )
  WITH CHECK (
    NOT "platform"."is_restricted_runtime"()
    OR (
      "projectId" IS NOT NULL
      AND "platform"."can_access_seo_project"("organizationId", "projectId")
    )
  );

GRANT USAGE ON SCHEMA "platform" TO PUBLIC;
GRANT EXECUTE ON FUNCTION "platform"."current_user_id"() TO PUBLIC;
GRANT EXECUTE ON FUNCTION "platform"."is_restricted_runtime"() TO PUBLIC;
GRANT EXECUTE ON FUNCTION "platform"."can_access_seo_project"(TEXT, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION "platform"."can_access_seo_site"(TEXT, TEXT) TO PUBLIC;
