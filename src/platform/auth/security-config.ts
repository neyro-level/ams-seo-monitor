const strictRule = (window: number, max: number) => ({ window, max });

export function createAuthRateLimitConfig() {
  return {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory" as const,
    customRules: {
      "/sign-in/email": strictRule(60, 5),
      "/sign-in/username": strictRule(60, 5),
      "/two-factor/enable": strictRule(60, 3),
      "/two-factor/disable": strictRule(60, 3),
      "/two-factor/get-totp-uri": strictRule(60, 3),
      "/two-factor/send-otp": strictRule(60, 3),
      "/two-factor/verify-otp": strictRule(60, 5),
      "/two-factor/verify-totp": strictRule(60, 5),
      "/two-factor/verify-backup-code": strictRule(60, 5),
      "/two-factor/generate-backup-codes": strictRule(60, 3),
    },
  };
}
