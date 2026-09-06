import { createHmac, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "better-auth/crypto";
import { auth } from "../src/platform/auth/auth.ts";
import { getPrismaClient } from "../src/platform/database/prisma/client.ts";
import {
  createUserSetupToken,
  hashUserSetupToken,
} from "../src/platform/auth/setup-token.ts";

const testPassword = "setup-test-password-2026";
const testUsernamePrefix = "setup_test_";
const testEmailPrefix = "setup-token-test-";

function decodeBase32(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function createTotp(secret: string, now = Date.now()): string {
  const counter = Math.floor(now / 30_000);
  const value = Buffer.alloc(8);
  value.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(value).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return (binary % 1_000_000).toString().padStart(6, "0");
}

function cookieHeader(headers: Headers): Headers {
  const cookies = headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  return new Headers({ cookie: cookies });
}

async function provisionSetupUser(options?: { expired?: boolean; revoked?: boolean }) {
  const prisma = getPrismaClient();
  const suffix = randomUUID();
  const userId = randomUUID();
  const token = createUserSetupToken();
  await prisma.user.create({
    data: {
      id: userId,
      username: `${testUsernamePrefix}${suffix.replaceAll("-", "")}`.slice(0, 30),
      email: `${testEmailPrefix}${suffix}@example.invalid`,
      name: "Setup Token Test",
      mustChangePassword: true,
      setupTokens: {
        create: {
          tokenHash: hashUserSetupToken(token),
          expiresAt: options?.expired
            ? new Date(Date.now() - 60_000)
            : new Date(Date.now() + 60 * 60_000),
          revokedAt: options?.revoked ? new Date() : null,
          createdBy: "integration-test",
        },
      },
    },
  });
  return { userId, token };
}

describe("setup-token onboarding and 2FA recovery", () => {
  beforeAll(() => {
    if (!auth) throw new Error("Better Auth test configuration is required");
  });

  afterAll(async () => {
    const prisma = getPrismaClient();
    await prisma.user.deleteMany({
      where: { email: { startsWith: testEmailPrefix } },
    });
  });

  it("sets the password once and commits token use, onboarding state and safe audit", async () => {
    const prisma = getPrismaClient();
    const setup = await provisionSetupUser();
    await auth!.api.completeUserSetup({
      body: { token: setup.token, newPassword: testPassword, correlationId: randomUUID() },
    });

    const [user, account, token, audit] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: setup.userId } }),
      prisma.account.findFirstOrThrow({ where: { userId: setup.userId, providerId: "credential" } }),
      prisma.userSetupToken.findUniqueOrThrow({ where: { tokenHash: hashUserSetupToken(setup.token) } }),
      prisma.auditEvent.findFirstOrThrow({
        where: { entityId: setup.userId, action: "auth.user-setup.completed" },
      }),
    ]);
    expect(user.mustChangePassword).toBe(false);
    expect(token.usedAt).not.toBeNull();
    expect(account.password && await verifyPassword({ hash: account.password, password: testPassword })).toBe(true);
    expect(JSON.stringify(audit)).not.toContain(setup.token);

    await expect(
      auth!.api.completeUserSetup({
        body: { token: setup.token, newPassword: "another-password", correlationId: randomUUID() },
      }),
    ).rejects.toMatchObject({ status: "UNAUTHORIZED" });
  });

  it.each([
    ["expired", { expired: true }],
    ["revoked", { revoked: true }],
  ] as const)("rejects a %s token without writing a credential", async (_label, state) => {
    const prisma = getPrismaClient();
    const setup = await provisionSetupUser(state);
    await expect(
      auth!.api.completeUserSetup({
        body: { token: setup.token, newPassword: testPassword, correlationId: randomUUID() },
      }),
    ).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect(await prisma.account.count({ where: { userId: setup.userId } })).toBe(0);
  });

  it("allows only one concurrent setup completion", async () => {
    const prisma = getPrismaClient();
    const setup = await provisionSetupUser();
    const attempts = await Promise.allSettled([
      auth!.api.completeUserSetup({
        body: { token: setup.token, newPassword: testPassword, correlationId: randomUUID() },
      }),
      auth!.api.completeUserSetup({
        body: { token: setup.token, newPassword: testPassword, correlationId: randomUUID() },
      }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    expect(await prisma.account.count({ where: { userId: setup.userId, providerId: "credential" } })).toBe(1);
  });

  it("enrolls TOTP and consumes a Better Auth backup code only once", async () => {
    const prisma = getPrismaClient();
    const setup = await provisionSetupUser();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: setup.userId } });
    await auth!.api.completeUserSetup({
      body: { token: setup.token, newPassword: testPassword, correlationId: randomUUID() },
    });

    const signedIn = await auth!.api.signInUsername({
      returnHeaders: true,
      body: { username: user.username!, password: testPassword },
    });
    const sessionHeaders = cookieHeader(signedIn.headers);
    const enrollment = await auth!.api.enableTwoFactor({
      body: { password: testPassword, method: "totp" },
      headers: sessionHeaders,
    });
    if (enrollment.method !== "totp") throw new Error("Expected TOTP enrollment");
    const secret = new URL(enrollment.totpURI).searchParams.get("secret");
    if (!secret) throw new Error("TOTP secret is missing");
    await auth!.api.verifyTOTP({
      body: { code: createTotp(secret) },
      headers: sessionHeaders,
    });

    const challenge = await auth!.api.signInUsername({
      returnHeaders: true,
      body: { username: user.username!, password: testPassword },
    });
    expect("twoFactorRedirect" in challenge.response).toBe(true);
    const challengeHeaders = cookieHeader(challenge.headers);
    const backupCode = enrollment.backupCodes[0]!;
    await auth!.api.verifyBackupCode({
      body: { code: backupCode },
      headers: challengeHeaders,
    });
    await expect(
      auth!.api.verifyBackupCode({
        body: { code: backupCode },
        headers: challengeHeaders,
      }),
    ).rejects.toBeDefined();
  });
});
