import type { PrincipalContext } from "../../../platform/authorization/principal.ts";
import { hashPassword } from "better-auth/crypto";
import { defineCommand } from "../../../platform/commands/define-command.ts";
import type { DatabaseTransaction } from "../../../platform/database/transaction.ts";
import {
  createMembershipInputSchema,
  createSeoProjectAccessInputSchema,
  createOrganizationInputSchema,
  IdentityAdminError,
  nextIdentityVersion,
  provisionClientInputSchema,
  removeMembershipInputSchema,
  removeSeoProjectAccessInputSchema,
  resetUserPasswordInputSchema,
  setUserEnabledInputSchema,
  updateMembershipInputSchema,
  updateSeoProjectAccessInputSchema,
  updateOrganizationInputSchema,
} from "../domain/admin-identity.ts";
import {
  requireIdentityAdminActor,
  requireIdentityAdminScope,
} from "./identity-admin-authorization.ts";
import type { IdentityAdminRepository } from "./ports/identity-admin-repository.ts";

export interface OrganizationCommandResult {
  organizationId: string;
  version: number;
}

export interface MembershipCommandResult {
  membershipId: string;
  version: number;
}

export interface RemoveMembershipCommandResult {
  membershipId: string;
}

export interface IdentityAdminCommandDependencies {
  createRepository(transaction: DatabaseTransaction): IdentityAdminRepository;
}

export function createIdentityAdminCommands(
  dependencies: IdentityAdminCommandDependencies,
) {
  const provisionClient = defineCommand<
    PrincipalContext,
    typeof provisionClientInputSchema,
    { organizationId: string; projectId: string; userId: string; membershipId: string; siteIds: string[] }
  >({
    name: "identity-access.client.provision",
    input: provisionClientInputSchema,
    authorize: (principal) => { requireIdentityAdminActor(principal); },
    execute: async ({ principal, input, transaction }) => {
      const actor = requireIdentityAdminActor(principal);
      const repository = dependencies.createRepository(transaction);
      const { password, ...safeInput } = input;
      const passwordHash = await hashPassword(password);
      const result = await repository.provisionClient({
        ...safeInput,
        passwordHash,
        actorId: actor.actorId,
        correlationId: actor.correlationId,
      });
      await repository.appendAudit({
        actorId: actor.actorId,
        action: "client.provision",
        entityType: "User",
        entityId: result.userId,
        organizationId: result.organizationId,
        beforeMarker: null,
        afterMarker: {
          username: input.username,
          projectId: result.projectId,
          tenantRole: input.tenantRole,
          siteCount: result.siteIds.length,
        },
        correlationId: actor.correlationId,
      });
      return result;
    },
  });

  const resetUserPassword = defineCommand<PrincipalContext, typeof resetUserPasswordInputSchema, { userId: string }>({
    name: "identity-access.user.password-reset",
    input: resetUserPasswordInputSchema,
    authorize: (principal) => { requireIdentityAdminActor(principal); },
    execute: async ({ principal, input, transaction }) => {
      const actor = requireIdentityAdminActor(principal);
      const repository = dependencies.createRepository(transaction);
      const passwordHash = await hashPassword(input.password);
      if (!await repository.resetUserPassword(input.userId, passwordHash)) throw new IdentityAdminError("USER_NOT_FOUND");
      await repository.appendAudit({ actorId: actor.actorId, action: "user.password-reset", entityType: "User", entityId: input.userId, organizationId: null, beforeMarker: null, afterMarker: { sessionsRevoked: true }, correlationId: actor.correlationId });
      return { userId: input.userId };
    },
  });

  const setUserEnabled = defineCommand<PrincipalContext, typeof setUserEnabledInputSchema, { userId: string; enabled: boolean }>({
    name: "identity-access.user.set-enabled",
    input: setUserEnabledInputSchema,
    authorize: (principal) => { requireIdentityAdminActor(principal); },
    execute: async ({ principal, input, transaction }) => {
      const actor = requireIdentityAdminActor(principal);
      const repository = dependencies.createRepository(transaction);
      if (!await repository.setUserEnabled(input.userId, input.enabled)) throw new IdentityAdminError("USER_NOT_FOUND");
      await repository.appendAudit({ actorId: actor.actorId, action: input.enabled ? "user.enable" : "user.disable", entityType: "User", entityId: input.userId, organizationId: null, beforeMarker: null, afterMarker: { enabled: input.enabled, sessionsRevoked: !input.enabled }, correlationId: actor.correlationId });
      return input;
    },
  });
  const createOrganization = defineCommand<
    PrincipalContext,
    typeof createOrganizationInputSchema,
    OrganizationCommandResult
  >({
    name: "identity-access.organization.create",
    input: createOrganizationInputSchema,
    authorize: (principal) => {
      requireIdentityAdminActor(principal);
    },
    execute: async ({ principal, input, transaction }) => {
      const actor = requireIdentityAdminActor(principal);
      const repository = dependencies.createRepository(transaction);
      const organization = await repository.createOrganization(input);
      await repository.appendAudit({
        actorId: actor.actorId,
        action: "organization.create",
        entityType: "Organization",
        entityId: organization.id,
        organizationId: organization.id,
        beforeMarker: null,
        afterMarker: {
          name: input.name,
          slug: input.slug,
          version: organization.version,
        },
        correlationId: actor.correlationId,
      });
      return { organizationId: organization.id, version: organization.version };
    },
  });

  const updateOrganization = defineCommand<
    PrincipalContext,
    typeof updateOrganizationInputSchema,
    OrganizationCommandResult
  >({
    name: "identity-access.organization.update",
    input: updateOrganizationInputSchema,
    authorize: (principal, input) => {
      requireIdentityAdminScope(principal, input.organizationId);
    },
    execute: async ({ principal, input, transaction }) => {
      const scope = requireIdentityAdminScope(principal, input.organizationId);
      const repository = dependencies.createRepository(transaction);
      const organization = await repository.findOrganizationForAction(
        input.organizationId,
      );
      if (!organization) {
        throw new IdentityAdminError("ORGANIZATION_NOT_FOUND_OR_FORBIDDEN");
      }
      if (organization.version !== input.version) {
        throw new IdentityAdminError("ORGANIZATION_STALE");
      }

      const updated = await repository.updateOrganization(input);
      if (!updated) {
        throw new IdentityAdminError("ORGANIZATION_STALE");
      }

      const version = nextIdentityVersion(input.version, "ORGANIZATION_STALE");
      await repository.appendAudit({
        actorId: scope.actorId,
        action: "organization.update",
        entityType: "Organization",
        entityId: organization.id,
        organizationId: scope.organizationId,
        beforeMarker: {
          name: organization.name,
          slug: organization.slug,
          version: organization.version,
        },
        afterMarker: {
          name: input.name,
          slug: input.slug,
          version,
        },
        correlationId: scope.correlationId,
      });
      return { organizationId: organization.id, version };
    },
  });

  const createMembership = defineCommand<
    PrincipalContext,
    typeof createMembershipInputSchema,
    MembershipCommandResult
  >({
    name: "identity-access.membership.create",
    input: createMembershipInputSchema,
    authorize: (principal, input) => {
      requireIdentityAdminScope(principal, input.organizationId);
    },
    execute: async ({ principal, input, transaction }) => {
      const scope = requireIdentityAdminScope(principal, input.organizationId);
      const repository = dependencies.createRepository(transaction);
      const membership = await repository.createMembership({
        ...input,
        tenantRole: input.tenantRole,
      });
      await repository.appendAudit({
        actorId: scope.actorId,
        action: "membership.create",
        entityType: "Member",
        entityId: membership.id,
        organizationId: scope.organizationId,
        beforeMarker: null,
        afterMarker: {
          userId: input.userId,
          tenantRole: input.tenantRole,
          version: membership.version,
        },
        correlationId: scope.correlationId,
      });
      return { membershipId: membership.id, version: membership.version };
    },
  });

  const updateMembership = defineCommand<
    PrincipalContext,
    typeof updateMembershipInputSchema,
    MembershipCommandResult
  >({
    name: "identity-access.membership.update",
    input: updateMembershipInputSchema,
    authorize: (principal, input) => {
      requireIdentityAdminScope(principal, input.organizationId);
    },
    execute: async ({ principal, input, transaction }) => {
      const scope = requireIdentityAdminScope(principal, input.organizationId);
      const repository = dependencies.createRepository(transaction);
      const membership = await repository.findMembershipForAction({
        organizationId: input.organizationId,
        membershipId: input.membershipId,
      });
      if (!membership) {
        throw new IdentityAdminError("MEMBERSHIP_NOT_FOUND_OR_FORBIDDEN");
      }
      if (membership.version !== input.version) {
        throw new IdentityAdminError("MEMBERSHIP_STALE");
      }

      const updated = await repository.updateMembership(input);
      if (!updated) {
        throw new IdentityAdminError("MEMBERSHIP_STALE");
      }
      await repository.revokeUserSessions(membership.userId);

      const version = nextIdentityVersion(input.version, "MEMBERSHIP_STALE");
      await repository.appendAudit({
        actorId: scope.actorId,
        action: "membership.update",
        entityType: "Member",
        entityId: membership.id,
        organizationId: scope.organizationId,
        beforeMarker: {
          userId: membership.userId,
          tenantRole: membership.tenantRole,
          version: membership.version,
        },
        afterMarker: {
          userId: membership.userId,
          tenantRole: input.tenantRole,
          version,
        },
        correlationId: scope.correlationId,
      });
      return { membershipId: membership.id, version };
    },
  });

  const removeMembership = defineCommand<
    PrincipalContext,
    typeof removeMembershipInputSchema,
    RemoveMembershipCommandResult
  >({
    name: "identity-access.membership.remove",
    input: removeMembershipInputSchema,
    authorize: (principal, input) => {
      requireIdentityAdminScope(principal, input.organizationId);
    },
    execute: async ({ principal, input, transaction }) => {
      const scope = requireIdentityAdminScope(principal, input.organizationId);
      const repository = dependencies.createRepository(transaction);
      const membership = await repository.findMembershipForAction({
        organizationId: input.organizationId,
        membershipId: input.membershipId,
      });
      if (!membership) {
        throw new IdentityAdminError("MEMBERSHIP_NOT_FOUND_OR_FORBIDDEN");
      }
      if (membership.version !== input.version) {
        throw new IdentityAdminError("MEMBERSHIP_STALE");
      }

      const removed = await repository.removeMembership({
        organizationId: input.organizationId,
        membershipId: input.membershipId,
        version: input.version,
      });
      if (!removed) {
        throw new IdentityAdminError("MEMBERSHIP_STALE");
      }
      await repository.revokeUserSessions(membership.userId);

      await repository.appendAudit({
        actorId: scope.actorId,
        action: "membership.remove",
        entityType: "Member",
        entityId: membership.id,
        organizationId: scope.organizationId,
        beforeMarker: {
          userId: membership.userId,
          tenantRole: membership.tenantRole,
          version: membership.version,
        },
        afterMarker: null,
        correlationId: scope.correlationId,
      });
      return { membershipId: membership.id };
    },
  });

  const createSeoProjectAccess = defineCommand<
    PrincipalContext,
    typeof createSeoProjectAccessInputSchema,
    { accessId: string; version: number }
  >({
    name: "identity-access.seo-project-access.create",
    input: createSeoProjectAccessInputSchema,
    authorize: (principal, input) => { requireIdentityAdminScope(principal, input.organizationId); },
    execute: async ({ principal, input, transaction }) => {
      const scope = requireIdentityAdminScope(principal, input.organizationId);
      const repository = dependencies.createRepository(transaction);
      const access = await repository.createSeoProjectAccess(input);
      await repository.revokeUserSessions(access.userId);
      await repository.appendAudit({
        actorId: scope.actorId,
        action: "seo-project-access.create",
        entityType: "SeoProjectAccess",
        entityId: access.id,
        organizationId: scope.organizationId,
        beforeMarker: null,
        afterMarker: { membershipId: input.membershipId, projectId: input.projectId, role: input.role, version: access.version },
        correlationId: scope.correlationId,
      });
      return { accessId: access.id, version: access.version };
    },
  });

  const updateSeoProjectAccess = defineCommand<
    PrincipalContext,
    typeof updateSeoProjectAccessInputSchema,
    { accessId: string; version: number }
  >({
    name: "identity-access.seo-project-access.update",
    input: updateSeoProjectAccessInputSchema,
    authorize: (principal, input) => { requireIdentityAdminScope(principal, input.organizationId); },
    execute: async ({ principal, input, transaction }) => {
      const scope = requireIdentityAdminScope(principal, input.organizationId);
      const repository = dependencies.createRepository(transaction);
      const access = await repository.findSeoProjectAccessForAction({ organizationId: input.organizationId, accessId: input.accessId });
      if (!access) throw new IdentityAdminError("PROJECT_ACCESS_NOT_FOUND_OR_FORBIDDEN");
      if (access.version !== input.version) throw new IdentityAdminError("PROJECT_ACCESS_STALE");
      if (!await repository.updateSeoProjectAccess(input)) throw new IdentityAdminError("PROJECT_ACCESS_STALE");
      await repository.revokeUserSessions(access.userId);
      const version = nextIdentityVersion(input.version, "PROJECT_ACCESS_STALE");
      await repository.appendAudit({
        actorId: scope.actorId,
        action: "seo-project-access.update",
        entityType: "SeoProjectAccess",
        entityId: access.id,
        organizationId: scope.organizationId,
        beforeMarker: { membershipId: access.membershipId, projectId: access.projectId, role: access.role, version: access.version },
        afterMarker: { membershipId: input.membershipId, projectId: input.projectId, role: input.role, version },
        correlationId: scope.correlationId,
      });
      return { accessId: access.id, version };
    },
  });

  const removeSeoProjectAccess = defineCommand<
    PrincipalContext,
    typeof removeSeoProjectAccessInputSchema,
    { accessId: string }
  >({
    name: "identity-access.seo-project-access.remove",
    input: removeSeoProjectAccessInputSchema,
    authorize: (principal, input) => { requireIdentityAdminScope(principal, input.organizationId); },
    execute: async ({ principal, input, transaction }) => {
      const scope = requireIdentityAdminScope(principal, input.organizationId);
      const repository = dependencies.createRepository(transaction);
      const access = await repository.findSeoProjectAccessForAction({ organizationId: input.organizationId, accessId: input.accessId });
      if (!access) throw new IdentityAdminError("PROJECT_ACCESS_NOT_FOUND_OR_FORBIDDEN");
      if (access.version !== input.version) throw new IdentityAdminError("PROJECT_ACCESS_STALE");
      if (!await repository.removeSeoProjectAccess(input)) throw new IdentityAdminError("PROJECT_ACCESS_STALE");
      await repository.revokeUserSessions(access.userId);
      await repository.appendAudit({
        actorId: scope.actorId,
        action: "seo-project-access.remove",
        entityType: "SeoProjectAccess",
        entityId: access.id,
        organizationId: scope.organizationId,
        beforeMarker: { membershipId: access.membershipId, projectId: access.projectId, role: access.role, version: access.version },
        afterMarker: null,
        correlationId: scope.correlationId,
      });
      return { accessId: access.id };
    },
  });

  return {
    createMembership,
    createSeoProjectAccess,
    createOrganization,
    removeMembership,
    removeSeoProjectAccess,
    updateMembership,
    updateSeoProjectAccess,
    updateOrganization,
    provisionClient,
    resetUserPassword,
    setUserEnabled,
  };
}
