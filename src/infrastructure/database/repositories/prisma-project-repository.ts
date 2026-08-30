
import type {
  ProjectRepository,
  StoredProjectRecord,
  StoredSiteRecord,
} from "../../../application/ports/project-repository";
import { getPrismaClient } from "../prisma/client";

function mapSiteRecord(site: {
  id: string;
  slug: string;
  name: string;
  url: string;
  timezone: string;
  enabled: boolean;
  projectId: string;
  project: { slug: string; organizationId: string };
  providerConnections: Array<{ enabled: boolean }>;
}): StoredSiteRecord {
  return {
    siteId: site.id,
    projectId: site.projectId,
    organizationId: site.project.organizationId,
    projectSlug: site.project.slug,
    siteSlug: site.slug,
    name: site.name,
    url: site.url,
    timezone: site.timezone,
    enabled: site.enabled,
    enabledSourceCount: site.providerConnections.filter((connection) => connection.enabled).length,
  };
}

function mapProjectRecord(project: {
  id: string;
  slug: string;
  name: string;
  status: "ACTIVE" | "PLANNED" | "DISABLED";
  organizationId: string;
  sites: Array<{
    id: string;
    slug: string;
    name: string;
    url: string;
    timezone: string;
    enabled: boolean;
    projectId: string;
    project: { slug: string; organizationId: string };
    providerConnections: Array<{ enabled: boolean }>;
  }>;
}): StoredProjectRecord {
  return {
    projectId: project.id,
    organizationId: project.organizationId,
    projectSlug: project.slug,
    name: project.name,
    status: project.status,
    sites: project.sites.map(mapSiteRecord),
  };
}

export class PrismaProjectRepository implements ProjectRepository {
  async listProjects(): Promise<StoredProjectRecord[]> {
    const projects = await getPrismaClient().project.findMany({
      orderBy: { slug: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        organizationId: true,
        sites: {
          orderBy: { slug: "asc" },
          select: {
            id: true,
            slug: true,
            name: true,
            url: true,
            timezone: true,
            enabled: true,
            projectId: true,
            project: {
              select: {
                slug: true,
                organizationId: true,
              },
            },
            providerConnections: {
              select: {
                enabled: true,
              },
            },
          },
        },
      },
    });

    return projects.map(mapProjectRecord);
  }

  async findProjectBySlug(projectSlug: string): Promise<StoredProjectRecord | null> {
    const project = await getPrismaClient().project.findUnique({
      where: { slug: projectSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        organizationId: true,
        sites: {
          orderBy: { slug: "asc" },
          select: {
            id: true,
            slug: true,
            name: true,
            url: true,
            timezone: true,
            enabled: true,
            projectId: true,
            project: {
              select: {
                slug: true,
                organizationId: true,
              },
            },
            providerConnections: {
              select: {
                enabled: true,
              },
            },
          },
        },
      },
    });

    return project ? mapProjectRecord(project) : null;
  }

  async findSiteBySlugs(projectSlug: string, siteSlug: string): Promise<StoredSiteRecord | null> {
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
        name: true,
        url: true,
        timezone: true,
        enabled: true,
        projectId: true,
        project: {
          select: {
            slug: true,
            organizationId: true,
          },
        },
        providerConnections: {
          select: {
            enabled: true,
          },
        },
      },
    });

    return site ? mapSiteRecord(site) : null;
  }

  async hasOrganizationMembership(userId: string, organizationId: string): Promise<boolean> {
    const membership = await getPrismaClient().member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: {
        organizationId: true,
      },
    });

    return Boolean(membership);
  }
}
