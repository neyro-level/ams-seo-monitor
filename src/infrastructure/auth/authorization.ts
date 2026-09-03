import "server-only";

import { createCorrelationId } from "../../platform/http/correlation";
import { ProjectService } from "../../application/services/project-service";
import { PrismaProjectRepository } from "../database/repositories/prisma-project-repository";
import { getPrismaClient } from "../database/prisma/client";
import {
  getPermissionsForRole,
  type ActorContext,
  type AuthorizedProjectAccess,
  type AuthorizedSiteAccess,
} from "../../application/ports/actor-context";

const projectService = new ProjectService(new PrismaProjectRepository());

export interface ActorContextOptions {
  activeOrganizationId?: string | null;
  correlationId?: string;
}

export async function getActorContextByUserId(
  userId: string,
  options: ActorContextOptions = {},
): Promise<ActorContext | null> {
  const user = await getPrismaClient().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      systemRole: true,
      disabledAt: true,
      members: {
        orderBy: { organizationId: "asc" },
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      },
    },
  });

  if (!user || user.disabledAt) {
    return null;
  }

  const memberships = user.members.map((membership) => ({
    membershipId: membership.id,
    organizationId: membership.organizationId,
    role: membership.role,
  }));
  const requestedOrganizationId = options.activeOrganizationId ?? null;
  const activeOrganizationId = memberships.some(
    (membership) => membership.organizationId === requestedOrganizationId,
  )
    ? requestedOrganizationId
    : null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    systemRole: user.systemRole,
    activeOrganizationId,
    memberships,
    permissions: getPermissionsForRole(user.systemRole),
    correlationId: options.correlationId ?? createCorrelationId(),
  };
}

export async function getAuthorizedProjectAccess(
  actor: ActorContext,
  projectSlug: string,
): Promise<AuthorizedProjectAccess | null> {
  const project = await projectService.getProjectAccessForUser(actor, projectSlug);
  if (!project) {
    return null;
  }

  return {
    organizationId: project.organizationId,
    projectId: project.projectId,
    projectSlug: project.projectSlug,
  };
}

export async function getAuthorizedSiteAccess(
  actor: ActorContext,
  projectSlug: string,
  siteSlug: string,
): Promise<AuthorizedSiteAccess | null> {
  const site = await projectService.getSiteAccessForUser(actor, projectSlug, siteSlug);
  if (!site) {
    return null;
  }

  return {
    organizationId: site.organizationId,
    projectId: site.projectId,
    siteId: site.siteId,
    projectSlug: site.projectSlug,
    siteSlug: site.siteSlug,
  };
}
