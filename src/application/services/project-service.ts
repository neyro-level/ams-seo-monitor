import type {
  ProjectRepository,
  StoredProjectRecord,
  StoredSiteRecord,
} from "../ports/project-repository";
import type { AuthenticatedUser } from "../../infrastructure/auth/types";

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

export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async listProjectsForUser(user: AuthenticatedUser): Promise<ProjectSummary[]> {
    const projects = await this.projectRepository.listProjects();
    const visibleProjects: StoredProjectRecord[] = [];

    for (const project of projects) {
      if (user.systemRole === "SEO_ANALYST") {
        visibleProjects.push(project);
        continue;
      }

      const hasMembership = await this.projectRepository.hasOrganizationMembership(
        user.userId,
        project.organizationId,
      );
      if (hasMembership) {
        visibleProjects.push(project);
      }
    }

    return visibleProjects.map((project) => ({
      projectId: project.projectId,
      organizationId: project.organizationId,
      projectSlug: project.projectSlug,
      name: project.name,
      status: project.status,
      totalSites: project.sites.length,
      connectedSites: project.sites.filter((site) => site.enabled).length,
      readySites: project.sites.filter((site) => site.enabled && site.enabledSourceCount >= 2).length,
      enabledSources: project.sites.reduce((count, site) => count + site.enabledSourceCount, 0),
    }));
  }

  async getProjectAccessForUser(
    user: AuthenticatedUser,
    projectSlug: string,
  ): Promise<StoredProjectRecord | null> {
    const project = await this.projectRepository.findProjectBySlug(projectSlug);
    if (!project) {
      return null;
    }

    if (user.systemRole === "SEO_ANALYST") {
      return project;
    }

    const hasMembership = await this.projectRepository.hasOrganizationMembership(
      user.userId,
      project.organizationId,
    );
    if (!hasMembership) {
      return null;
    }

    return project;
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

    if (user.systemRole === "SEO_ANALYST") {
      return site;
    }

    const hasMembership = await this.projectRepository.hasOrganizationMembership(
      user.userId,
      site.organizationId,
    );
    if (!hasMembership) {
      return null;
    }

    return site;
  }
}
