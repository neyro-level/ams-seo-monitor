import { z } from "zod";
import type { TenantRole } from "../../../platform/authorization/principal.ts";

const identifierSchema = z.string().trim().min(1).max(128);
const positiveVersionSchema = z.number().int().positive();
const slugSchema = z
  .string()
  .trim()
  .min(1, "Укажите slug организации")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Используйте строчные латинские буквы, цифры и дефис");
const organizationNameSchema = z
  .string()
  .trim()
  .min(2, "Укажите название организации")
  .max(160);

export const tenantRoleSchema = z.enum(["ORG_OWNER", "ORG_MEMBER", "VIEWER"]);

export const identityAdminListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(""),
  sort: z.enum(["name", "status", "createdAt", "updatedAt"]).default("updatedAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const createOrganizationInputSchema = z.object({
  slug: slugSchema,
  name: organizationNameSchema,
});

export const updateOrganizationInputSchema = z.object({
  organizationId: identifierSchema,
  version: positiveVersionSchema,
  slug: slugSchema,
  name: organizationNameSchema,
});

export const createMembershipInputSchema = z.object({
  organizationId: identifierSchema,
  userId: identifierSchema,
  tenantRole: tenantRoleSchema,
});

export const updateMembershipInputSchema = z.object({
  organizationId: identifierSchema,
  membershipId: identifierSchema,
  version: positiveVersionSchema,
  tenantRole: tenantRoleSchema,
});

export const removeMembershipInputSchema = z.object({
  organizationId: identifierSchema,
  membershipId: identifierSchema,
  version: positiveVersionSchema,
});

export type IdentityAdminListQuery = z.infer<typeof identityAdminListQuerySchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInputSchema>;
export type CreateMembershipInput = z.infer<typeof createMembershipInputSchema>;
export type UpdateMembershipInput = z.infer<typeof updateMembershipInputSchema>;
export type RemoveMembershipInput = z.infer<typeof removeMembershipInputSchema>;

export interface OrganizationListItem {
  id: string;
  slug: string;
  name: string;
  version: number;
  membershipCount: number;
  projectCount: number;
  updatedAt: string;
}

export interface OrganizationListResult {
  items: OrganizationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MembershipListItem {
  id: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
  userEmail: string;
  tenantRole: TenantRole;
  version: number;
  updatedAt: string;
}

export interface MembershipListResult {
  items: MembershipListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IdentityAdminFormOptions {
  organizations: Array<{ id: string; name: string }>;
  users: Array<{ id: string; label: string }>;
}

export type IdentityAdminErrorCode =
  | "IDENTITY_ADMIN_ACCESS_DENIED"
  | "ORGANIZATION_NOT_FOUND_OR_FORBIDDEN"
  | "ORGANIZATION_STALE"
  | "ORGANIZATION_SLUG_CONFLICT"
  | "MEMBERSHIP_NOT_FOUND_OR_FORBIDDEN"
  | "MEMBERSHIP_STALE"
  | "MEMBERSHIP_ALREADY_EXISTS"
  | "MEMBERSHIP_REFERENCE_INVALID";

export class IdentityAdminError extends Error {
  constructor(public readonly code: IdentityAdminErrorCode) {
    super(code);
    this.name = "IdentityAdminError";
  }
}

export function nextIdentityVersion(
  version: number,
  staleCode: "ORGANIZATION_STALE" | "MEMBERSHIP_STALE",
): number {
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new IdentityAdminError(staleCode);
  }
  return version + 1;
}
