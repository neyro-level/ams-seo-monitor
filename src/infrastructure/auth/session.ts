import "server-only";

import { headers } from "next/headers";
import { auth } from "./auth";
import { getActorContextByUserId } from "./authorization";
import type { ActorContext } from "../../application/ports/actor-context";

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

  return getActorContextByUserId(session.user.id, {
    activeOrganizationId: session.session.activeOrganizationId ?? null,
  });
}
