import "server-only";

import { headers } from "next/headers";
import { auth } from "../../../platform/auth/auth.ts";
import { getPrismaClient } from "../../../platform/database/prisma/client.ts";
import { getActorContextByUserId } from "./authorization.ts";
import type { ActorContext } from "../domain/actor-context.ts";

export async function getCurrentActorContext(): Promise<ActorContext | null> {
  if (!auth) {
    return null;
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    return null;
  }

  const persistedSession = await getPrismaClient().session.findUnique({
    where: { id: session.session.id },
    select: { activeOrganizationId: true },
  });
  return getActorContextByUserId(session.user.id, {
    activeOrganizationId: persistedSession?.activeOrganizationId ?? null,
  });
}
