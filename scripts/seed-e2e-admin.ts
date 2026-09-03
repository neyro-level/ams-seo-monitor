import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { createLocalAccountIssuer } from "better-auth/db";
import { getPrismaClient } from "../src/platform/database/prisma/client.ts";

const E2E_USERNAME = "e2e.platform.admin";
const E2E_EMAIL = "e2e-platform-admin@example.invalid";
const E2E_PASSWORD = "E2e-local-only-2026!";
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

async function main() {
  if (process.argv[2] !== "--confirm-local-e2e") {
    throw new Error("Explicit local E2E confirmation is required");
  }
  if (!process.env.DATABASE_HOST || !localHosts.has(process.env.DATABASE_HOST)) {
    throw new Error("E2E admin seed is restricted to a loopback PostgreSQL host");
  }

  const prisma = getPrismaClient();
  try {
    const existing = await prisma.user.findUnique({
      where: { email: E2E_EMAIL },
      select: { id: true },
    });
    const userId = existing?.id ?? randomUUID();
    await prisma.user.upsert({
      where: { email: E2E_EMAIL },
      update: {
        name: "E2E Platform Admin",
        username: E2E_USERNAME,
        systemRole: "PLATFORM_ADMIN",
        disabledAt: null,
      },
      create: {
        id: userId,
        email: E2E_EMAIL,
        username: E2E_USERNAME,
        name: "E2E Platform Admin",
        systemRole: "PLATFORM_ADMIN",
        emailVerified: false,
      },
    });
    const issuer = createLocalAccountIssuer("credential");
    const passwordHash = await hashPassword(E2E_PASSWORD);
    await prisma.account.upsert({
      where: { issuer_accountId: { issuer, accountId: userId } },
      update: { userId, providerId: "credential", password: passwordHash },
      create: {
        id: randomUUID(),
        userId,
        providerId: "credential",
        issuer,
        accountId: userId,
        password: passwordHash,
      },
    });
    console.log(JSON.stringify({ seeded: true, username: E2E_USERNAME }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "E2E admin seed failed");
  process.exitCode = 1;
});
