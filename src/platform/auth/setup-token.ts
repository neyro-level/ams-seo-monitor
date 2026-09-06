import { createHash, randomBytes } from "node:crypto";

export const USER_SETUP_TOKEN_BYTES = 32;
export const USER_SETUP_TOKEN_TTL_HOURS = 24;

export function createUserSetupToken(): string {
  return randomBytes(USER_SETUP_TOKEN_BYTES).toString("base64url");
}

export function hashUserSetupToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getUserSetupTokenExpiry(now = new Date()): Date {
  return new Date(now.getTime() + USER_SETUP_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}
