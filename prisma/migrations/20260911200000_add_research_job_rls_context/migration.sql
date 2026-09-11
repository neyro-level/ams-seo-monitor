CREATE OR REPLACE FUNCTION "platform"."worker_can_access_tools_project"(
  target_organization_id TEXT,
  target_project_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT current_user = 'ams_worker'
    AND NULLIF(current_setting('ams.job_organization_id', true), '') = target_organization_id
    AND NULLIF(current_setting('ams.job_project_id', true), '') = target_project_id
$$;

GRANT EXECUTE ON FUNCTION "platform"."worker_can_access_tools_project"(TEXT, TEXT) TO PUBLIC;

DO $policies$
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
    EXECUTE format('DROP POLICY project_scope ON %s', table_ref);
    EXECUTE format(
      'CREATE POLICY project_scope ON %s USING (
        NOT "platform"."is_restricted_runtime"()
        OR "platform"."can_access_tools_project"("organizationId", "projectId")
        OR "platform"."worker_can_access_tools_project"("organizationId", "projectId")
      ) WITH CHECK (
        NOT "platform"."is_restricted_runtime"()
        OR "platform"."can_access_tools_project"("organizationId", "projectId")
        OR "platform"."worker_can_access_tools_project"("organizationId", "projectId")
      )',
      table_ref
    );
  END LOOP;
END
$policies$;

DROP POLICY project_scope ON "tools"."ToolsProject";
CREATE POLICY project_scope ON "tools"."ToolsProject"
  USING (
    NOT "platform"."is_restricted_runtime"()
    OR "platform"."can_access_tools_project"("organizationId", id)
    OR "platform"."worker_can_access_tools_project"("organizationId", id)
  )
  WITH CHECK (
    NOT "platform"."is_restricted_runtime"()
    OR "platform"."can_access_tools_project"("organizationId", id)
    OR "platform"."worker_can_access_tools_project"("organizationId", id)
  );
