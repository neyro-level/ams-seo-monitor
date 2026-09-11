DROP POLICY "organization_scope" ON "tools"."ToolsOrganization";

CREATE POLICY "organization_scope" ON "tools"."ToolsOrganization"
  USING (
    NOT "platform"."is_restricted_runtime"()
    OR EXISTS (
      SELECT 1 FROM "public"."User" AS app_user
      WHERE app_user.id = "platform"."current_user_id"()
        AND app_user."disabledAt" IS NULL
        AND (
          app_user."systemRole" = 'PLATFORM_ADMIN'::"public"."SystemRole"
          OR EXISTS (
            SELECT 1 FROM "tools"."ToolsMembership" AS membership
            WHERE membership."organizationId" = "ToolsOrganization".id
              AND membership."userId" = app_user.id
          )
        )
    )
  )
  WITH CHECK (
    NOT "platform"."is_restricted_runtime"()
    OR EXISTS (
      SELECT 1 FROM "public"."User" AS app_user
      WHERE app_user.id = "platform"."current_user_id"()
        AND app_user."disabledAt" IS NULL
        AND app_user."systemRole" = 'PLATFORM_ADMIN'::"public"."SystemRole"
    )
  );
