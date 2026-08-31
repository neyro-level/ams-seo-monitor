import "server-only";

import { headers } from "next/headers";
import { auth } from "./auth";
import { getAuthenticatedUserById } from "./authorization";
import type { AuthenticatedUser } from "../../application/ports/authenticated-user";

export async function getCurrentAuthenticatedUser(): Promise<AuthenticatedUser | null> {
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

  return getAuthenticatedUserById(session.user.id);
}
