import type { AuthenticatedUser } from "../ports/authenticated-user";
import { ProjectService } from "./project-service";

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

export class SiteService {
  constructor(private readonly projectService: ProjectService) {}

  async getProjectOverviewForUser(
    user: AuthenticatedUser,
    clientSlug: string,
  ): Promise<ClientOverview | null> {
    const project = await this.projectService.getProjectTreeForUser(user, clientSlug);
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
}
