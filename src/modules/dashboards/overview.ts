import "server-only";

import { ProjectService, type ProjectSummary } from "../../application/services/project-service";
import { PrismaProjectRepository } from "../../infrastructure/database/repositories/prisma-project-repository";
import type { AuthenticatedUser } from "../../infrastructure/auth/types";

export interface AnalystOverview {
  totalProjects: number;
  totalSites: number;
  connectedSites: number;
  plannedSites: number;
  enabledSources: number;
  projectCards: ProjectSummary[];
}

export interface ClientOverview {
  client: {
    clientSlug: string;
    name: string;
    enabled: boolean;
  };
  sites: Array<{
    siteSlug: string;
    name: string;
    siteUrl: string;
    enabled: boolean;
    enabledSourceCount: number;
  }>;
}

const projectService = new ProjectService(new PrismaProjectRepository());

export async function buildAnalystOverview(user: AuthenticatedUser): Promise<AnalystOverview> {
  const projectCards = await projectService.listProjectsForUser(user);
  const totalSites = projectCards.reduce((count, project) => count + project.totalSites, 0);
  const connectedSites = projectCards.reduce((count, project) => count + project.connectedSites, 0);
  const plannedSites = totalSites - connectedSites;
  const enabledSources = projectCards.reduce((count, project) => count + project.enabledSources, 0);

  return {
    totalProjects: projectCards.length,
    totalSites,
    connectedSites,
    plannedSites,
    enabledSources,
    projectCards,
  };
}

export async function buildClientOverview(
  user: AuthenticatedUser,
  clientSlug: string,
): Promise<ClientOverview | null> {
  const project = await projectService.getProjectAccessForUser(user, clientSlug);
  if (!project) {
    return null;
  }

  return {
    client: {
      clientSlug: project.projectSlug,
      name: project.name,
      enabled: project.status !== "DISABLED",
    },
    sites: project.sites.map((site) => ({
      siteSlug: site.siteSlug,
      name: site.name,
      siteUrl: site.url,
      enabled: site.enabled,
      enabledSourceCount: site.enabledSourceCount,
    })),
  };
}
