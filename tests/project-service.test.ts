import { describe, expect, it } from "vitest";
import { ProjectService } from "../src/modules/project-registry/index.ts";
import type {
  ProjectAccessScope,
  ProjectRepository,
  StoredProjectRecord,
  StoredSiteRecord,
} from "../src/modules/project-registry/index.ts";
import {
  createDeniedJobPrincipal,
  createPlatformAdminPrincipal,
  createPlatformAnalystPrincipal,
  createTenantUserPrincipal,
} from "./helpers/principal.ts";

const analystUser = createPlatformAnalystPrincipal("analyst-1");

const REDACTED_CLIENT_DATAViewer = createTenantUserPrincipal({
  userId: "viewer-1",
  membershipId: "membership-REDACTED_CLIENT_DATA",
  organizationId: "org-REDACTED_CLIENT_DATA",
});

const platformAdmin = createPlatformAdminPrincipal();

const deniedPrincipal = createDeniedJobPrincipal("org-REDACTED_CLIENT_DATA");

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
  async listProjects(scope: ProjectAccessScope): Promise<StoredProjectRecord[]> {
    return scope.organizationIds === null
      ? projects
      : projects.filter((project) => scope.organizationIds!.includes(project.organizationId));
  }

  async findProjectBySlug(
    projectSlug: string,
    scope: ProjectAccessScope,
  ): Promise<StoredProjectRecord | null> {
    return (
      (await this.listProjects(scope)).find((project) => project.projectSlug === projectSlug) ?? null
    );
  }

  async findSiteBySlugs(
    projectSlug: string,
    siteSlug: string,
    scope: ProjectAccessScope,
  ): Promise<StoredSiteRecord | null> {
    const project = await this.findProjectBySlug(projectSlug, scope);
    return project?.sites.find((site) => site.siteSlug === siteSlug) ?? null;
  }
}

describe("ProjectService", () => {
  const projectService = new ProjectService(new FakeProjectRepository());

  it("shows every project to analyst", async () => {
    expect(await projectService.listProjectsForUser(analystUser)).toHaveLength(2);
  });

  it("allows platform admin through capabilities rather than analyst role equality", async () => {
    expect(await projectService.listProjectsForUser(platformAdmin)).toHaveLength(2);
  });

  it("limits client viewer to own organization", async () => {
    const visibleProjects = await projectService.listProjectsForUser(REDACTED_CLIENT_DATAViewer);
    expect(visibleProjects).toHaveLength(1);
    expect(visibleProjects[0]?.projectSlug).toBe("REDACTED_CLIENT_DATA");
  });

  it("denies a principal without project read capability", async () => {
    expect(await projectService.listProjectsForUser(deniedPrincipal)).toEqual([]);
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
