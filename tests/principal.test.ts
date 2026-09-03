import { describe, expect, it } from "vitest";
import { isPlatformAdminTwoFactorRequired } from "../src/platform/auth/two-factor-policy.ts";
import {
  getPrincipalPermissions,
  hasPermission,
  isTenantPrincipal,
  type PlatformAdminPrincipal,
  type PlatformAnalystPrincipal,
  type TenantUserPrincipal,
} from "../src/platform/authorization/principal.ts";
import {
  createJobPrincipal,
  requirePlatformAdmin,
  requirePlatformAnalyst,
  requireTenantUser,
} from "../src/platform/authorization/principal-factories.ts";

const correlationId = "00000000-0000-4000-8000-000000000070";
const admin: PlatformAdminPrincipal = {
  kind: "platform-admin",
  userId: "admin-1",
  correlationId,
};
const analyst: PlatformAnalystPrincipal = {
  kind: "platform-analyst",
  userId: "analyst-1",
  correlationId,
};
const viewer: TenantUserPrincipal = {
  kind: "tenant-user",
  userId: "viewer-1",
  organizationId: "organization-a",
  membershipId: "membership-a",
  role: "VIEWER",
  correlationId,
};

describe("PrincipalContext", () => {
  it("separates platform principals from tenant principals", () => {
    expect(admin).not.toHaveProperty("organizationId");
    expect(analyst).not.toHaveProperty("organizationId");
    expect(isTenantPrincipal(viewer)).toBe(true);
    expect(isTenantPrincipal(admin)).toBe(false);
  });

  it("keeps platform analyst read-only and tenant viewer organization-scoped", () => {
    expect(hasPermission(admin, "platform:manage")).toBe(true);
    expect(hasPermission(analyst, "platform:manage")).toBe(false);
    expect(hasPermission(analyst, "project:read:any")).toBe(true);
    expect(hasPermission(viewer, "project:read:organization")).toBe(true);
    expect(hasPermission(viewer, "project:read:any")).toBe(false);
    expect(getPrincipalPermissions(viewer)).toEqual([
      "project:read:organization",
      "report:read:organization",
    ]);
  });

  it("requires the exact principal type at privileged boundaries", () => {
    expect(requirePlatformAdmin(admin)).toBe(admin);
    expect(requirePlatformAnalyst(analyst)).toBe(analyst);
    expect(requireTenantUser(viewer)).toBe(viewer);
    expect(() => requirePlatformAdmin(viewer)).toThrow("PLATFORM_ADMIN_REQUIRED");
    expect(() => requireTenantUser(admin)).toThrow("TENANT_USER_REQUIRED");
  });

  it("creates job principal with an explicit tenant", () => {
    expect(
      createJobPrincipal({ jobName: "project-sync", organizationId: "organization-a", correlationId }),
    ).toEqual({
      kind: "job",
      jobName: "project-sync",
      organizationId: "organization-a",
      correlationId,
    });
  });

  it("requires platform-admin 2FA in production but isolates local E2E", () => {
    expect(isPlatformAdminTwoFactorRequired({ NODE_ENV: "production" })).toBe(true);
    expect(isPlatformAdminTwoFactorRequired({ NODE_ENV: "development" })).toBe(false);
    expect(
      isPlatformAdminTwoFactorRequired({ NODE_ENV: "production", AMS_E2E_TEST: "true" }),
    ).toBe(false);
  });
});
