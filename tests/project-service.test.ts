import { describe, expect, it } from "vitest";
import { ProjectService } from "../src/application/services/project-service";
import type {
  ProjectRepository,
  StoredProjectRecord,
  StoredSiteRecord,
} from "../src/application/ports/project-repository";
import type { AuthenticatedUser } from "../src/infrastructure/auth/types";

const analystUser: AuthenticatedUser = {
  userId: "analyst-1",
  email: "analyst@test.local",
  name: "Analyst",
  systemRole: "SEO_ANALYST",
  activeOrganizationId: null,
};

const REDACTED_CLIENT_DATAViewer: AuthenticatedUser = {
  userId: "viewer-1",
  email: "viewer@test.local",
  name: "Viewer",
  systemRole: "CLIENT_VIEWER",
  activeOrganizationId: null,
};

const projects: StoredProjectRecord[] = [
  {
    projectId: "project-REDACTED_CLIENT_DATA",
    organizationId: "org-REDACTED_CLIENT_DATA",
    projectSlug: "REDACTED_CLIENT_DATA",
    name: "REDACTED_CLIENT_DATA",
    status: "ACTIVE",
    sites: [
      {
        siteId: "site-REDACTED_CLIENT_DATA",
        projectId: "project-REDACTED_CLIENT_DATA",
        organizationId: "org-REDACTED_CLIENT_DATA",
        projectSlug: "REDACTED_CLIENT_DATA",
        siteSlug: "REDACTED_CLIENT_DATA",
        name: "REDACTED_CLIENT_DATA",
        url: "https://REDACTED_CLIENT_DATA",
        timezone: "+03:00",
        enabled: true,
        enabledSourceCount: 2,
      },
      {
        siteId: "site-REDACTED_CLIENT_DATA",
        projectId: "project-REDACTED_CLIENT_DATA",
        organizationId: "org-REDACTED_CLIENT_DATA",
        projectSlug: "REDACTED_CLIENT_DATA",
        siteSlug: "REDACTED_CLIENT_DATA",
        name: "REDACTED_CLIENT_DATA",
        url: "https://REDACTED_CLIENT_DATA",
        timezone: "+03:00",
        enabled: true,
        enabledSourceCount: 2,
      },
    ],
  },
  {
    projectId: "project-REDACTED_CLIENT_DATA",
    organizationId: "org-REDACTED_CLIENT_DATA",
    projectSlug: "REDACTED_CLIENT_DATA",
    name: "Союз застройщиков",
    status: "PLANNED",
    sites: [
      {
        siteId: "site-REDACTED_CLIENT_DATA",
        projectId: "project-REDACTED_CLIENT_DATA",
        organizationId: "org-REDACTED_CLIENT_DATA",
        projectSlug: "REDACTED_CLIENT_DATA",
        siteSlug: "REDACTED_CLIENT_DATA",
        name: "Ростов-на-Дону",
        url: "https://todo.invalid/REDACTED_CLIENT_DATA",
        timezone: "+03:00",
        enabled: false,
        enabledSourceCount: 0,
      },
    ],
  },
];

class FakeProjectRepository implements ProjectRepository {
  async listProjects(): Promise<StoredProjectRecord[]> {
    return projects;
  }

  async findProjectBySlug(projectSlug: string): Promise<StoredProjectRecord | null> {
    return projects.find((project) => project.projectSlug === projectSlug) ?? null;
  }

  async findSiteBySlugs(projectSlug: string, siteSlug: string): Promise<StoredSiteRecord | null> {
    const project = projects.find((item) => item.projectSlug === projectSlug);
    return project?.sites.find((site) => site.siteSlug === siteSlug) ?? null;
  }

  async hasOrganizationMembership(userId: string, organizationId: string): Promise<boolean> {
    return userId === "viewer-1" && organizationId === "org-REDACTED_CLIENT_DATA";
  }
}

describe("ProjectService", () => {
  const projectService = new ProjectService(new FakeProjectRepository());

  it("shows every project to analyst", async () => {
    expect(await projectService.listProjectsForUser(analystUser)).toHaveLength(2);
  });

  it("limits client viewer to own organization", async () => {
    const visibleProjects = await projectService.listProjectsForUser(REDACTED_CLIENT_DATAViewer);
    expect(visibleProjects).toHaveLength(1);
    expect(visibleProjects[0]?.projectSlug).toBe("REDACTED_CLIENT_DATA");
  });

  it("returns site access only inside allowed organization", async () => {
    expect(
      await projectService.getSiteAccessForUser(REDACTED_CLIENT_DATAViewer, "REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA"),
    ).not.toBeNull();
    expect(
      await projectService.getSiteAccessForUser(REDACTED_CLIENT_DATAViewer, "REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA"),
    ).toBeNull();
  });
});
