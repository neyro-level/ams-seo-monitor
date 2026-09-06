import "server-only";

import { headers } from "next/headers";
import { getPrismaClient } from "../database/prisma/client.ts";
import {
  getPrincipalStateByUserId,
  type PrincipalState,
} from "../authorization/principal-factories.ts";
import { auth } from "./auth.ts";
import { isPlatformAdminTwoFactorRequired } from "./two-factor-policy.ts";

export type CabinetPrincipalErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "CABINET_USER_INACTIVE"
  | "PASSWORD_ONBOARDING_REQUIRED"
  | "TWO_FACTOR_REQUIRED";

export class CabinetPrincipalError extends Error {
  constructor(readonly code: CabinetPrincipalErrorCode) {
    super(code);
    this.name = "CabinetPrincipalError";
  }
}

async function getFreshPrincipalState(): Promise<{
  state: PrincipalState | null;
  disabled: boolean;
} | null> {
  if (!auth) return null;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });
  if (!session) return null;

  const persistedSession = await getPrismaClient().session.findUnique({
    where: { id: session.session.id },
    select: {
      userId: true,
      expiresAt: true,
      user: { select: { disabledAt: true } },
    },
  });
  if (
    !persistedSession ||
    persistedSession.userId !== session.user.id ||
    persistedSession.expiresAt <= new Date()
  ) {
    return null;
  }

  const state = await getPrincipalStateByUserId(session.user.id);
  return { state, disabled: persistedSession.user.disabledAt !== null };
}

export async function getCurrentPrincipalState(): Promise<PrincipalState | null> {
  return (await getFreshPrincipalState())?.state ?? null;
}

export async function requireCurrentAuthenticatedPrincipal() {
  const result = await getFreshPrincipalState();
  if (!result) throw new CabinetPrincipalError("AUTHENTICATION_REQUIRED");
  if (result.disabled || !result.state) throw new CabinetPrincipalError("CABINET_USER_INACTIVE");
  return result.state.principal;
}

export function requireCabinetPrincipalFromState(
  state: PrincipalState,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (state.mustChangePassword) {
    throw new CabinetPrincipalError("PASSWORD_ONBOARDING_REQUIRED");
  }
  if (
    state.principal.kind === "platform-admin" &&
    isPlatformAdminTwoFactorRequired(env) &&
    !state.twoFactorEnabled
  ) {
    throw new CabinetPrincipalError("TWO_FACTOR_REQUIRED");
  }
  return state.principal;
}

export async function requireCurrentCabinetPrincipal() {
  const result = await getFreshPrincipalState();
  if (!result) throw new CabinetPrincipalError("AUTHENTICATION_REQUIRED");
  if (result.disabled || !result.state) throw new CabinetPrincipalError("CABINET_USER_INACTIVE");
  // Better Auth 1.7.2 does not issue an authenticated credential session until
  // the configured 2FA challenge succeeds, so this fresh session is the proof.
  return requireCabinetPrincipalFromState(result.state);
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
