import type {
  ProjectRepository,
  StoredProjectRecord,
  StoredSiteRecord,
} from "../ports/project-repository";
import type { AuthenticatedUser } from "../ports/authenticated-user";

export interface ProjectSiteSummary {
  siteId: string;
  projectId: string;
  organizationId: string;
  projectSlug: string;
  siteSlug: string;
  name: string;
  url: string;
  timezone: string;
  enabled: boolean;
  enabledSourceCount: number;
}

export interface ProjectTree {
  projectId: string;
  organizationId: string;
  projectSlug: string;
  name: string;
  status: "ACTIVE" | "PLANNED" | "DISABLED";
  sites: ProjectSiteSummary[];
}

export interface ProjectSummary {
  projectId: string;
  organizationId: string;
  projectSlug: string;
  name: string;
  status: "ACTIVE" | "PLANNED" | "DISABLED";
  totalSites: number;
  connectedSites: number;
  readySites: number;
  enabledSources: number;
}

function toProjectTree(project: StoredProjectRecord): ProjectTree {
  return {
    projectId: project.projectId,
    organizationId: project.organizationId,
    projectSlug: project.projectSlug,
    name: project.name,
    status: project.status,
    sites: project.sites.map((site) => ({
      siteId: site.siteId,
      projectId: site.projectId,
      organizationId: site.organizationId,
      projectSlug: site.projectSlug,
      siteSlug: site.siteSlug,
      name: site.name,
      url: site.url,
      timezone: site.timezone,
      enabled: site.enabled,
      enabledSourceCount: site.enabledSourceCount,
    })),
  };
}

function toProjectSummary(project: ProjectTree): ProjectSummary {
  return {
    projectId: project.projectId,
    organizationId: project.organizationId,
    projectSlug: project.projectSlug,
    name: project.name,
    status: project.status,
    totalSites: project.sites.length,
    connectedSites: project.sites.filter((site) => site.enabled).length,
    readySites: project.sites.filter((site) => site.enabled && site.enabledSourceCount >= 2).length,
    enabledSources: project.sites.reduce((count, site) => count + site.enabledSourceCount, 0),
  };
}

export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  private async isProjectVisibleToUser(
    user: AuthenticatedUser,
    organizationId: string,
  ): Promise<boolean> {
    if (user.systemRole === "SEO_ANALYST") {
      return true;
    }

    return this.projectRepository.hasOrganizationMembership(user.userId, organizationId);
  }

  async listProjectTreesForUser(user: AuthenticatedUser): Promise<ProjectTree[]> {
    const projects = await this.projectRepository.listProjects();
    const visibleProjects: ProjectTree[] = [];

    for (const project of projects) {
      if (await this.isProjectVisibleToUser(user, project.organizationId)) {
        visibleProjects.push(toProjectTree(project));
      }
    }

    return visibleProjects;
  }

  async listProjectsForUser(user: AuthenticatedUser): Promise<ProjectSummary[]> {
    const projects = await this.listProjectTreesForUser(user);
    return projects.map(toProjectSummary);
  }

  async getProjectTreeForUser(
    user: AuthenticatedUser,
    projectSlug: string,
  ): Promise<ProjectTree | null> {
    const project = await this.getProjectAccessForUser(user, projectSlug);
    return project ? toProjectTree(project) : null;
  }

  async getProjectAccessForUser(
    user: AuthenticatedUser,
    projectSlug: string,
  ): Promise<StoredProjectRecord | null> {
    const project = await this.projectRepository.findProjectBySlug(projectSlug);
    if (!project) {
      return null;
    }

    const visible = await this.isProjectVisibleToUser(user, project.organizationId);
    return visible ? project : null;
  }

  async getSiteAccessForUser(
    user: AuthenticatedUser,
    projectSlug: string,
    siteSlug: string,
  ): Promise<StoredSiteRecord | null> {
    const site = await this.projectRepository.findSiteBySlugs(projectSlug, siteSlug);
    if (!site) {
      return null;
    }

    const visible = await this.isProjectVisibleToUser(user, site.organizationId);
    return visible ? site : null;
  }

  async getSiteBySlugs(projectSlug: string, siteSlug: string): Promise<StoredSiteRecord | null> {
    return this.projectRepository.findSiteBySlugs(projectSlug, siteSlug);
  }
}
