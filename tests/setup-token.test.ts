import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  createUserSetupToken,
  getUserSetupTokenExpiry,
  hashUserSetupToken,
  USER_SETUP_TOKEN_BYTES,
} from "../src/platform/auth/setup-token.ts";

describe("user setup token", () => {
  it("creates a 32-byte opaque token and stores a deterministic SHA-256 hash", () => {
    const token = createUserSetupToken();
    expect(Buffer.from(token, "base64url")).toHaveLength(USER_SETUP_TOKEN_BYTES);
    expect(hashUserSetupToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashUserSetupToken(token)).not.toContain(token);
  });

  it("uses a bounded expiry", () => {
    const now = new Date("2026-09-06T12:00:00.000Z");
    expect(getUserSetupTokenExpiry(now).toISOString()).toBe("2026-09-07T12:00:00.000Z");
  });
});
