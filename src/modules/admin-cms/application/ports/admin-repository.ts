import type { AdminResourceKey } from "../../domain/resources.ts";

export type AdminSortField = "name" | "status" | "createdAt" | "updatedAt";
export type AdminSortDirection = "asc" | "desc";

export interface AdminListQuery {
  page: number;
  pageSize: number;
  search: string;
  sort: AdminSortField;
  direction: AdminSortDirection;
}

export interface AdminResourceRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export interface AdminResourcePage {
  rows: AdminResourceRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface AdminSelectOption {
  value: string;
  label: string;
}

export interface AdminFormOptions {
  organizations: AdminSelectOption[];
  users: AdminSelectOption[];
  projects: AdminSelectOption[];
  sites: AdminSelectOption[];
  thresholdProfiles: AdminSelectOption[];
  clusterProfiles: AdminSelectOption[];
}

export interface AdminDashboardSummary {
  organizations: number;
  projects: number;
  sites: number;
  enabledProviders: number;
  runningSyncs: number;
  pendingJobs: number;
}

export interface AuditContext {
  actorId: string;
  correlationId: string;
  organizationId: string | null;
}

export interface SaveOrganizationInput {
  id?: string;
  slug: string;
  name: string;
}

export interface SaveMembershipInput {
  organizationId: string;
  userId: string;
  role: string;
}

export interface RemoveMembershipInput {
  organizationId: string;
  userId: string;
}

export interface SaveProjectInput {
  id?: string;
  organizationId: string;
  slug: string;
  name: string;
  status: "ACTIVE" | "PLANNED" | "DISABLED";
  thresholdProfileId: string;
  clusterProfileId: string;
}

export interface SaveSiteInput {
  id?: string;
  projectId: string;
  slug: string;
  name: string;
  url: string;
  timezone: string;
  enabled: boolean;
}

export interface SaveProviderConnectionInput {
  siteId: string;
  provider: "YANDEX_WEBMASTER" | "YANDEX_METRIKA" | "TOPVISOR";
  externalId: string | null;
  enabled: boolean;
  settings: Record<string, string | number | boolean | null> | null;
}

export interface SaveGoalInput {
  projectId: string;
  externalGoalId: string;
  label: string;
  category:
    | "LEAD_SUBMIT"
    | "PHONE_CLICK"
    | "MESSENGER_CLICK"
    | "FORM_START"
    | "FILE_DOWNLOAD"
    | "OTHER";
  direction: "PRIMARY" | "SECONDARY";
  includeInSeoConversion: boolean;
}

export interface ReplaceTrackedQuerySetInput {
  siteId: string;
  source: "OWNER_PROVIDED" | "TOPVISOR";
  baselineLabel: string;
  queries: string[];
}

export interface SaveThresholdProfileInput {
  slug: string;
  minimumShows: number;
  maximumCtrPercent: number;
  maximumAveragePosition: number;
  showsDropPercent: number;
  clicksDropPercent: number;
  positionWorsenedDelta: number;
  pagesInSearchDropPercent: number;
  organicVisitsDropPercent: number;
  goalConversionDropPercent: number;
}

export interface ClusterGroupInput {
  slug: string;
  label: string;
  order: number;
  brandTerms: string[];
  terms: string[];
}

export interface SaveClusterProfileInput {
  slug: string;
  name: string;
  groups: ClusterGroupInput[];
}

export interface AdminRepository {
  getDashboardSummary(): Promise<AdminDashboardSummary>;
  getFormOptions(): Promise<AdminFormOptions>;
  listResource(resource: AdminResourceKey, query: AdminListQuery): Promise<AdminResourcePage>;
  saveOrganization(input: SaveOrganizationInput, audit: AuditContext): Promise<string>;
  saveMembership(input: SaveMembershipInput, audit: AuditContext): Promise<string>;
  removeMembership(input: RemoveMembershipInput, audit: AuditContext): Promise<string>;
  saveProject(input: SaveProjectInput, audit: AuditContext): Promise<string>;
  saveSite(input: SaveSiteInput, audit: AuditContext): Promise<string>;
  saveProviderConnection(input: SaveProviderConnectionInput, audit: AuditContext): Promise<string>;
  saveGoal(input: SaveGoalInput, audit: AuditContext): Promise<string>;
  replaceTrackedQuerySet(input: ReplaceTrackedQuerySetInput, audit: AuditContext): Promise<string>;
  saveThresholdProfile(input: SaveThresholdProfileInput, audit: AuditContext): Promise<string>;
  saveClusterProfile(input: SaveClusterProfileInput, audit: AuditContext): Promise<string>;
}
