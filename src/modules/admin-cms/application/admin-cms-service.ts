import { hasPermission, type ActorContext } from "../../identity-access/index.ts";
import type { AdminResourceKey } from "../domain/resources.ts";
import type {
  AdminListQuery,
  AdminRepository,
  AuditContext,
  ReplaceTrackedQuerySetInput,
  RemoveMembershipInput,
  SaveClusterProfileInput,
  SaveGoalInput,
  SaveMembershipInput,
  SaveOrganizationInput,
  SaveProjectInput,
  SaveProviderConnectionInput,
  SaveSiteInput,
  SaveThresholdProfileInput,
} from "./ports/admin-repository.ts";

function authorizeAdmin(actor: ActorContext): AuditContext {
  if (!hasPermission(actor, "platform:manage")) {
    throw new Error("ADMIN_ACCESS_DENIED");
  }

  return {
    actorId: actor.userId,
    correlationId: actor.correlationId,
    organizationId: null,
  };
}

export class AdminCmsService {
  constructor(private readonly repository: AdminRepository) {}

  getDashboardSummary(actor: ActorContext) {
    authorizeAdmin(actor);
    return this.repository.getDashboardSummary();
  }

  getFormOptions(actor: ActorContext) {
    authorizeAdmin(actor);
    return this.repository.getFormOptions();
  }

  listResource(actor: ActorContext, resource: AdminResourceKey, query: AdminListQuery) {
    authorizeAdmin(actor);
    return this.repository.listResource(resource, query);
  }

  saveOrganization(actor: ActorContext, input: SaveOrganizationInput) {
    const audit = authorizeAdmin(actor);
    return this.repository.saveOrganization(input, {
      ...audit,
      organizationId: input.id ?? null,
    });
  }

  saveMembership(actor: ActorContext, input: SaveMembershipInput) {
    const audit = authorizeAdmin(actor);
    return this.repository.saveMembership(input, {
      ...audit,
      organizationId: input.organizationId,
    });
  }

  removeMembership(actor: ActorContext, input: RemoveMembershipInput) {
    const audit = authorizeAdmin(actor);
    return this.repository.removeMembership(input, {
      ...audit,
      organizationId: input.organizationId,
    });
  }

  saveProject(actor: ActorContext, input: SaveProjectInput) {
    const audit = authorizeAdmin(actor);
    return this.repository.saveProject(input, {
      ...audit,
      organizationId: input.organizationId,
    });
  }

  saveSite(actor: ActorContext, input: SaveSiteInput) {
    return this.repository.saveSite(input, authorizeAdmin(actor));
  }

  saveProviderConnection(actor: ActorContext, input: SaveProviderConnectionInput) {
    return this.repository.saveProviderConnection(input, authorizeAdmin(actor));
  }

  saveGoal(actor: ActorContext, input: SaveGoalInput) {
    return this.repository.saveGoal(input, authorizeAdmin(actor));
  }

  replaceTrackedQuerySet(actor: ActorContext, input: ReplaceTrackedQuerySetInput) {
    return this.repository.replaceTrackedQuerySet(input, authorizeAdmin(actor));
  }

  saveThresholdProfile(actor: ActorContext, input: SaveThresholdProfileInput) {
    return this.repository.saveThresholdProfile(input, authorizeAdmin(actor));
  }

  saveClusterProfile(actor: ActorContext, input: SaveClusterProfileInput) {
    return this.repository.saveClusterProfile(input, authorizeAdmin(actor));
  }
}
