"use server";

import { redirect } from "next/navigation";
import { defineAction } from "../../../platform/actions/define-action.ts";
import { completePasswordOnboarding } from "../../../platform/auth/complete-password-onboarding.ts";
import { getCurrentPrincipalState } from "../../../platform/auth/principal-session.ts";

export const completePasswordOnboardingAction = defineAction(async () => {
  const state = await getCurrentPrincipalState();
  if (!state) redirect("/?login=1");

  try {
    await completePasswordOnboarding(state.principal, {});
    return { ok: true, data: { next: state.principal.kind === "platform-admin" ? "/onboarding/two-factor/" : "/dashboard/" } };
  } catch {
    return {
      ok: false,
      code: "PASSWORD_ONBOARDING_FAILED",
      message: "Не удалось завершить настройку пароля.",
      correlationId: state.principal.correlationId,
      fieldErrors: {},
    };
  }
});
