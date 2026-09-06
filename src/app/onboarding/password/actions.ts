"use server";

import { defineAction } from "../../../platform/actions/define-action.ts";
import { completePasswordOnboarding } from "../../../platform/auth/complete-password-onboarding.ts";

export const completePasswordOnboardingAction = defineAction<Record<string, never>, { next: string }>({
  access: "password-onboarding",
  execute: async ({ principal }) => {
    await completePasswordOnboarding(principal, {});
    return {
      next:
        principal.kind === "platform-admin"
          ? "/onboarding/two-factor/"
          : "/dashboard/",
    };
  },
  mapError: () => ({
    code: "PASSWORD_ONBOARDING_FAILED",
    message: "Не удалось завершить настройку пароля.",
  }),
});
