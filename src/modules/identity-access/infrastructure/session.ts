import "server-only";

import { headers } from "next/headers";
import { auth } from "./auth.ts";
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

  return getActorContextByUserId(session.user.id, {
    activeOrganizationId: session.session.activeOrganizationId ?? null,
  });
}
