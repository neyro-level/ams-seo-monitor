import type { TenantRole } from "../../../../platform/authorization/principal.ts";
import type {
  CreateMembershipInput,
  CreateSeoProjectAccessInput,
  CreateOrganizationInput,
  IdentityAdminFormOptions,
  IdentityAdminListQuery,
  IdentityAdminUserListItem,
  MembershipListResult,
  OrganizationListResult,
  ProvisionClientInput,
  ProvisionClientResult,
  UpdateMembershipInput,
  UpdateSeoProjectAccessInput,
  UpdateOrganizationInput,
} from "../../domain/admin-identity.ts";
import type { ProductRole } from "../../../../platform/authorization/access-types.ts";

export interface OrganizationActionRecord {
  id: string;
  slug: string;
  name: string;
  version: number;
}

export interface MembershipActionRecord {
  id: string;
  organizationId: string;
  userId: string;
  tenantRole: TenantRole;
  version: number;
}

export interface SeoProjectAccessActionRecord {
  id: string;
  membershipId: string;
  organizationId: string;
  projectId: string;
  userId: string;
  role: ProductRole;
  version: number;
}

export interface IdentityAdminAuditInput {
  actorId: string;
  action: string;
  entityType: "Organization" | "Member" | "User" | "SeoProjectAccess";
  entityId: string;
  organizationId: string | null;
  beforeMarker: Record<string, string | number | boolean | null> | null;
  afterMarker: Record<string, string | number | boolean | null> | null;
  correlationId: string;
}

export type ProvisionClientPersistenceInput = Omit<ProvisionClientInput, "password"> & {
  passwordHash: string;
  actorId: string;
  correlationId: string;
};

export interface IdentityAdminRepository {
  listOrganizations(query: IdentityAdminListQuery): Promise<OrganizationListResult>;
  listMemberships(query: IdentityAdminListQuery): Promise<MembershipListResult>;
  listSeoProjectAccesses(): Promise<import("../../domain/admin-identity.ts").SeoProjectAccessListItem[]>;
  listFormOptions(): Promise<IdentityAdminFormOptions>;
  listUsers(): Promise<IdentityAdminUserListItem[]>;
  provisionClient(input: ProvisionClientPersistenceInput): Promise<ProvisionClientResult>;
  resetUserPassword(userId: string, passwordHash: string): Promise<boolean>;
  setUserEnabled(userId: string, enabled: boolean): Promise<boolean>;
  createOrganization(input: CreateOrganizationInput): Promise<{ id: string; version: number }>;
  findOrganizationForAction(organizationId: string): Promise<OrganizationActionRecord | null>;
  updateOrganization(input: UpdateOrganizationInput): Promise<boolean>;
  createMembership(input: CreateMembershipInput): Promise<{ id: string; version: number }>;
  findMembershipForAction(input: {
    organizationId: string;
    membershipId: string;
  }): Promise<MembershipActionRecord | null>;
  updateMembership(input: UpdateMembershipInput): Promise<boolean>;
  removeMembership(input: {
    organizationId: string;
    membershipId: string;
    version: number;
  }): Promise<boolean>;
  createSeoProjectAccess(input: CreateSeoProjectAccessInput): Promise<{ id: string; version: number; userId: string }>;
  findSeoProjectAccessForAction(input: { organizationId: string; accessId: string }): Promise<SeoProjectAccessActionRecord | null>;
  updateSeoProjectAccess(input: UpdateSeoProjectAccessInput): Promise<boolean>;
  removeSeoProjectAccess(input: { organizationId: string; accessId: string; version: number }): Promise<boolean>;
  revokeUserSessions(userId: string): Promise<void>;
  appendAudit(input: IdentityAdminAuditInput): Promise<void>;
}
