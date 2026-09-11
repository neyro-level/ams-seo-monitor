import { Prisma } from "../../generated/prisma/client.ts";
import type { DatabaseTransaction } from "./transaction.ts";

export interface DatabaseAuthorizationContext {
  userId: string;
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
