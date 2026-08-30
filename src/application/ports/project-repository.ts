export interface StoredSiteRecord {
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

export interface StoredProjectRecord {
  projectId: string;
  organizationId: string;
  projectSlug: string;
  name: string;
  status: "ACTIVE" | "PLANNED" | "DISABLED";
  sites: StoredSiteRecord[];
}

export interface ProjectRepository {
  listProjects(): Promise<StoredProjectRecord[]>;
  findProjectBySlug(projectSlug: string): Promise<StoredProjectRecord | null>;
  findSiteBySlugs(projectSlug: string, siteSlug: string): Promise<StoredSiteRecord | null>;
  hasOrganizationMembership(userId: string, organizationId: string): Promise<boolean>;
}
