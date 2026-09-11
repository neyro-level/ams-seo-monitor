import type {
  ArchiveToolsProjectInput,
  CreateToolsOrganizationInput,
  CreateToolsProjectInput,
  GrantToolsProjectInput,
  ToolsOrganizationRecord,
  ToolsProjectRecord,
  ToolsProjectOption,
  UpdateToolsOrganizationInput,
  UpdateToolsProjectInput,
} from "../../domain/tools-workspace.ts";

export interface ToolsWorkspaceRepository {
  listOrganizations(): Promise<ToolsOrganizationRecord[]>;
  listProjects(projectIds: string[] | null): Promise<ToolsProjectRecord[]>;
  listProjectOptions(projectIds: string[] | null): Promise<ToolsProjectOption[]>;
  createOrganization(input: CreateToolsOrganizationInput): Promise<ToolsOrganizationRecord>;
  updateOrganization(input: UpdateToolsOrganizationInput): Promise<ToolsOrganizationRecord | null>;
  createProject(input: CreateToolsProjectInput): Promise<ToolsProjectRecord>;
  updateProject(input: UpdateToolsProjectInput): Promise<ToolsProjectRecord | null>;
  archiveProject(input: ArchiveToolsProjectInput): Promise<boolean>;
  grantProject(input: GrantToolsProjectInput & { actorId: string; correlationId: string }): Promise<{ accessId: string; userId: string }>;
}
