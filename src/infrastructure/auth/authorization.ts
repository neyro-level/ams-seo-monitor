import "server-only";

import { getPrismaClient } from "../database/prisma/client";
import type {
  AuthenticatedUser,
  AuthorizedProjectAccess,
  AuthorizedSiteAccess,
} from "./types";

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
  const project = await getPrismaClient().project.findUnique({
    where: { slug: projectSlug },
    select: {
      id: true,
      slug: true,
      organizationId: true,
    },
  });

  if (!project) {
    return null;
  }

  if (user.systemRole === "SEO_ANALYST") {
    return {
      organizationId: project.organizationId,
      projectId: project.id,
      projectSlug: project.slug,
    };
  }

  const membership = await getPrismaClient().member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: project.organizationId,
        userId: user.userId,
      },
    },
    select: {
      organizationId: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    organizationId: project.organizationId,
    projectId: project.id,
    projectSlug: project.slug,
  };
}

export async function getAuthorizedSiteAccess(
  user: AuthenticatedUser,
  projectSlug: string,
  siteSlug: string,
): Promise<AuthorizedSiteAccess | null> {
  const site = await getPrismaClient().site.findFirst({
    where: {
      slug: siteSlug,
      project: {
        slug: projectSlug,
      },
    },
    select: {
      id: true,
      slug: true,
      projectId: true,
      project: {
        select: {
          slug: true,
          organizationId: true,
        },
      },
    },
  });

  if (!site) {
    return null;
  }

  if (user.systemRole !== "SEO_ANALYST") {
    const membership = await getPrismaClient().member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: site.project.organizationId,
          userId: user.userId,
        },
      },
      select: {
        organizationId: true,
      },
    });

    if (!membership) {
      return null;
    }
  }

  return {
    organizationId: site.project.organizationId,
    projectId: site.projectId,
    siteId: site.id,
    projectSlug: site.project.slug,
    siteSlug: site.slug,
  };
}
