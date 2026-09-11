import { z } from "zod";
import { PRODUCT_ROLES } from "../../../platform/authorization/access-types.ts";

const id = z.string().trim().min(1).max(128);
const slug = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const name = z.string().trim().min(2).max(160);

export const createToolsOrganizationSchema = z.object({ slug, name });
export const updateToolsOrganizationSchema = createToolsOrganizationSchema.extend({ organizationId: id, version: z.number().int().positive() });
export const createToolsProjectSchema = z.object({ organizationId: id, slug, name });
export const updateToolsProjectSchema = createToolsProjectSchema.extend({ projectId: id, version: z.number().int().positive() });
export const archiveToolsProjectSchema = z.object({ organizationId: id, projectId: id, version: z.number().int().positive() });
export const grantToolsProjectSchema = z.object({ organizationId: id, projectId: id, userId: id, role: z.enum(PRODUCT_ROLES) });

export type CreateToolsOrganizationInput = z.infer<typeof createToolsOrganizationSchema>;
export type UpdateToolsOrganizationInput = z.infer<typeof updateToolsOrganizationSchema>;
export type CreateToolsProjectInput = z.infer<typeof createToolsProjectSchema>;
export type UpdateToolsProjectInput = z.infer<typeof updateToolsProjectSchema>;
export type ArchiveToolsProjectInput = z.infer<typeof archiveToolsProjectSchema>;
export type GrantToolsProjectInput = z.infer<typeof grantToolsProjectSchema>;

export interface ToolsOrganizationRecord { id: string; slug: string; name: string; version: number; archivedAt: string | null }
export interface ToolsProjectRecord { id: string; organizationId: string; slug: string; name: string; version: number; archivedAt: string | null }
export interface ToolsProjectOption extends ToolsProjectRecord { organizationName: string; organizationSlug: string }

export class ToolsWorkspaceError extends Error {
  constructor(public readonly code: "TOOLS_ADMIN_ACCESS_DENIED" | "TOOLS_RECORD_STALE" | "TOOLS_REFERENCE_INVALID") {
    super(code);
    this.name = "ToolsWorkspaceError";
  }
}
