
import { ProjectService } from "../../application/services/project-service";
import { PrismaProjectRepository } from "../database/repositories/prisma-project-repository";
import { getPrismaClient } from "../database/prisma/client";
import type {
  AuthenticatedUser,
  AuthorizedProjectAccess,
  AuthorizedSiteAccess,
} from "./types";

const projectService = new ProjectService(new PrismaProjectRepository());

export async function getAuthenticatedUserById(userId: string): Promise<AuthenticatedUser | null> {
  const user = await getPrismaClient().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      systemRole: true,
      disabledAt: true,
    },
  });

  if (!user || user.disabledAt) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    systemRole: user.systemRole,
    activeOrganizationId: null,
  };
}

export async function getAuthorizedProjectAccess(
  user: AuthenticatedUser,
  projectSlug: string,
): Promise<AuthorizedProjectAccess | null> {
  const project = await projectService.getProjectAccessForUser(user, projectSlug);
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
  user: AuthenticatedUser,
  projectSlug: string,
  siteSlug: string,
): Promise<AuthorizedSiteAccess | null> {
  const site = await projectService.getSiteAccessForUser(user, projectSlug, siteSlug);
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
