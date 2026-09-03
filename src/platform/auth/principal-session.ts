import "server-only";

import { headers } from "next/headers";
import { getPrismaClient } from "../database/prisma/client.ts";
import {
  getPrincipalStateByUserId,
  type PrincipalState,
} from "../authorization/principal-factories.ts";
import { auth } from "./auth.ts";
import { isPlatformAdminTwoFactorRequired } from "./two-factor-policy.ts";

export async function getCurrentPrincipalState(): Promise<PrincipalState | null> {
  if (!auth) return null;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const persistedSession = await getPrismaClient().session.findUnique({
    where: { id: session.session.id },
    select: { activeOrganizationId: true },
  });
  return getPrincipalStateByUserId(session.user.id, {
    // Legacy DB session state is accepted only after fresh AMS Membership validation.
    activeOrganizationId: persistedSession?.activeOrganizationId ?? null,
  });
}

export async function getCurrentCabinetRedirect(): Promise<string | null> {
  const state = await getCurrentPrincipalState();
  if (!state) return "/?login=1";
  if (state.mustChangePassword) return "/onboarding/password/";
  if (
    state.principal.kind === "platform-admin" &&
    !state.twoFactorEnabled &&
    isPlatformAdminTwoFactorRequired()
  ) {
    return "/onboarding/two-factor/";
  }
  return null;
}
