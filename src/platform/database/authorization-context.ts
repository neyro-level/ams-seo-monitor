import { Prisma } from "../../generated/prisma/client.ts";
import type { DatabaseTransaction } from "./transaction.ts";

export interface DatabaseAuthorizationContext {
  userId: string;
}

export interface DatabaseJobContext {
  organizationId: string;
  projectId: string;
}

export async function setDatabaseAuthorizationContext(
  transaction: DatabaseTransaction,
  context: DatabaseAuthorizationContext,
): Promise<void> {
  if (!context.userId.trim()) throw new Error("DATABASE_USER_CONTEXT_REQUIRED");
  await transaction.$executeRaw(
    Prisma.sql`SELECT set_config('ams.user_id', ${context.userId}, true)`,
  );
}

export async function setDatabaseJobContext(
  transaction: DatabaseTransaction,
  context: DatabaseJobContext,
): Promise<void> {
  if (!context.organizationId.trim() || !context.projectId.trim()) {
    throw new Error("DATABASE_JOB_CONTEXT_REQUIRED");
  }
  await transaction.$executeRaw(
    Prisma.sql`SELECT
      set_config('ams.job_organization_id', ${context.organizationId}, true),
      set_config('ams.job_project_id', ${context.projectId}, true)`,
  );
}
