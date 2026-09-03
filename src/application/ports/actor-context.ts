export const PERMISSIONS = [
  "platform:manage",
  "membership:manage:any",
  "project:read:any",
  "project:read:organization",
  "project:manage:any",
  "report:read:any",
  "report:read:organization",
  "sync:read:any",
  "sync:run:any",
  "settings:manage:any",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type SystemRole = "PLATFORM_ADMIN" | "SEO_ANALYST" | "CLIENT_VIEWER";

export interface MembershipScope {
  membershipId: string;
  organizationId: string;
  role: string;
}

export interface ActorContext {
  userId: string;
  email: string;
  name: string;
  systemRole: SystemRole;
  activeOrganizationId: string | null;
  memberships: readonly MembershipScope[];
  permissions: readonly Permission[];
  correlationId: string;
}

export function parseSystemRole(value: string): SystemRole {
  if (
    value === "PLATFORM_ADMIN" ||
    value === "SEO_ANALYST" ||
    value === "CLIENT_VIEWER"
  ) {
    return value;
  }

  throw new Error(`Unsupported system role: ${value}`);
}

const PERMISSIONS_BY_ROLE: Record<SystemRole, readonly Permission[]> = {
  PLATFORM_ADMIN: PERMISSIONS,
  SEO_ANALYST: [
    "project:read:any",
    "report:read:any",
    "sync:read:any",
    "sync:run:any",
  ],
  CLIENT_VIEWER: ["project:read:organization", "report:read:organization"],
};

export function getPermissionsForRole(role: SystemRole): readonly Permission[] {
  return PERMISSIONS_BY_ROLE[role];
}

export function hasPermission(actor: ActorContext, permission: Permission): boolean {
  return actor.permissions.includes(permission);
}

export function getActorOrganizationIds(actor: ActorContext): string[] {
  return actor.memberships.map((membership) => membership.organizationId);
}

export interface AuthorizedProjectAccess {
  organizationId: string;
  projectId: string;
  projectSlug: string;
}

export interface AuthorizedSiteAccess {
  organizationId: string;
  projectId: string;
  siteId: string;
  projectSlug: string;
  siteSlug: string;
}
