import { describe, expect, it } from "vitest";
import { createAuthRateLimitConfig } from "../src/platform/auth/security-config.ts";

describe("Better Auth rate-limit contract", () => {
  it("explicitly enables strict rules for the installed login and 2FA endpoints", () => {
    const config = createAuthRateLimitConfig();

    expect(config.enabled).toBe(true);
    expect(config.storage).toBe("memory");
    expect(config.customRules).toMatchObject({
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-in/username": { window: 60, max: 5 },
      "/two-factor/enable": { window: 60, max: 3 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
      "/two-factor/generate-backup-codes": { window: 60, max: 3 },
    });
  });
});
