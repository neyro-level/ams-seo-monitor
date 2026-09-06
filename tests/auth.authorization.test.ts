import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, SystemRole } from "../src/generated/prisma/client.ts"
import { createLocalAccountIssuer } from "better-auth/db";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import { ProjectService } from "../src/modules/project-registry/index.ts";
import { PrismaProjectRepository } from "../src/modules/project-registry/server.ts";
import { getPrincipalStateByUserId } from "../src/platform/authorization/principal-factories.ts";
import { createPgPoolConfigFromEnvironment } from "../src/platform/database/prisma/pool-config.ts";
import {
  hasPermission,
  type PrincipalContext,
} from "../src/platform/authorization/principal.ts";

const authTestDatabaseUrl = process.env.AUTH_TEST_DATABASE_URL ?? null;
const authTestDatabaseHost =
  process.env.AUTH_TEST_DATABASE_HOST ?? process.env.TEST_DATABASE_HOST ?? null;
const authTestDatabasePort =
  process.env.AUTH_TEST_DATABASE_PORT ?? process.env.TEST_DATABASE_PORT ?? null;
const authTestDatabaseUser =
  process.env.AUTH_TEST_DATABASE_USER ?? process.env.TEST_DATABASE_USER ?? null;
const authTestDatabasePassword =
  process.env.AUTH_TEST_DATABASE_PASSWORD ?? process.env.TEST_DATABASE_PASSWORD ?? null;
const authTestDatabaseName =
  process.env.AUTH_TEST_DATABASE_NAME ?? process.env.TEST_DATABASE_NAME ?? null;
const authTestDatabaseSslMode =
  process.env.AUTH_TEST_DATABASE_SSLMODE ?? process.env.TEST_DATABASE_SSLMODE ?? null;
const authTestEnabled =
  authTestDatabaseUrl !== null ||
  Boolean(
    authTestDatabaseHost &&
      authTestDatabaseUser &&
      authTestDatabasePassword &&
      authTestDatabaseName,
  );
const authTestDescription = authTestEnabled ? describe : describe.skip;

const authTestEmails = {
  platformAdmin: "platform-admin-test@seo-monitor.local",
  analyst: "analyst-test@seo-monitor.local",
  REDACTED_CLIENT_DATAViewer: "client-REDACTED_CLIENT_DATA-test@seo-monitor.local",
  REDACTED_CLIENT_DATAViewer: "client-REDACTED_CLIENT_DATA-test@seo-monitor.local",
  disabledViewer: "client-disabled-test@seo-monitor.local",
} as const;

let prisma: PrismaClient | null = null;
let pool: Pool | null = null;
let platformAdminUser: PrincipalContext | null = null;
let analystUser: PrincipalContext | null = null;
let REDACTED_CLIENT_DATAViewerUser: PrincipalContext | null = null;
let REDACTED_CLIENT_DATAViewerUser: PrincipalContext | null = null;
let disabledViewerId: string | null = null;
const projectService = new ProjectService(new PrismaProjectRepository());

async function ensureCredentialUser(email: string, name: string, systemRole: SystemRole) {
  if (!prisma) {
    throw new Error("Prisma test client is not initialized");
  }

  const passwordHash = await hashPassword(`pw-${email}`);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  const userId = existingUser?.id ?? randomUUID();

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      systemRole,
      disabledAt: null,
    },
    create: {
      id: userId,
      email,
      name,
      systemRole,
      emailVerified: false,
    },
  });

  await prisma.account.upsert({
    where: {
      issuer_accountId: {
        issuer: createLocalAccountIssuer("credential"),
        accountId: userId,
      },
    },
    update: {
      userId,
      providerId: "credential",
      password: passwordHash,
    },
    create: {
      id: randomUUID(),
      userId,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      accountId: userId,
      password: passwordHash,
    },
  });

  return userId;
}

authTestDescription("authorization matrix", () => {
  beforeAll(async () => {
    pool = new Pool(
      createPgPoolConfigFromEnvironment({
        DATABASE_URL: authTestDatabaseUrl ?? undefined,
        DATABASE_HOST: authTestDatabaseHost ?? undefined,
        DATABASE_PORT: authTestDatabasePort ?? undefined,
        DATABASE_USER: authTestDatabaseUser ?? undefined,
        DATABASE_PASSWORD: authTestDatabasePassword ?? undefined,
        DATABASE_NAME: authTestDatabaseName ?? undefined,
        DATABASE_SSLMODE: authTestDatabaseSslMode ?? undefined,
      }),
    );
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    const REDACTED_CLIENT_DATAOrganization = await prisma.organization.findUniqueOrThrow({
      where: { slug: "REDACTED_CLIENT_DATA" },
      select: { id: true },
    });
    const REDACTED_CLIENT_DATAOrganization = await prisma.organization.findUniqueOrThrow({
      where: { slug: "REDACTED_CLIENT_DATA" },
      select: { id: true },
    });

    const platformAdminUserId = await ensureCredentialUser(
      authTestEmails.platformAdmin,
      "Platform Admin Test",
      SystemRole.PLATFORM_ADMIN,
    );
    const analystUserId = await ensureCredentialUser(
      authTestEmails.analyst,
      "SEO Analyst Test",
      SystemRole.SEO_ANALYST,
    );
    const REDACTED_CLIENT_DATAViewerId = await ensureCredentialUser(
      authTestEmails.REDACTED_CLIENT_DATAViewer,
      "REDACTED_CLIENT_DATA Viewer Test",
      SystemRole.CLIENT_VIEWER,
    );
    const REDACTED_CLIENT_DATAViewerId = await ensureCredentialUser(
      authTestEmails.REDACTED_CLIENT_DATAViewer,
      "REDACTED_CLIENT_DATA Viewer Test",
      SystemRole.CLIENT_VIEWER,
    );
    disabledViewerId = await ensureCredentialUser(
      authTestEmails.disabledViewer,
      "Disabled Viewer Test",
      SystemRole.CLIENT_VIEWER,
    );

    await prisma.user.update({
      where: { id: disabledViewerId },
      data: { disabledAt: new Date() },
    });

    await prisma.member.upsert({
      where: {
        organizationId_userId: {
          organizationId: REDACTED_CLIENT_DATAOrganization.id,
          userId: REDACTED_CLIENT_DATAViewerId,
        },
      },
      update: { role: "client_viewer" },
      create: {
        organizationId: REDACTED_CLIENT_DATAOrganization.id,
        userId: REDACTED_CLIENT_DATAViewerId,
        role: "client_viewer",
      },
    });

    await prisma.member.upsert({
      where: {
        organizationId_userId: {
          organizationId: REDACTED_CLIENT_DATAOrganization.id,
          userId: REDACTED_CLIENT_DATAViewerId,
        },
      },
      update: { role: "client_viewer" },
      create: {
        organizationId: REDACTED_CLIENT_DATAOrganization.id,
        userId: REDACTED_CLIENT_DATAViewerId,
        role: "client_viewer",
      },
    });

    platformAdminUser = (await getPrincipalStateByUserId(platformAdminUserId, {
      correlationId: "00000000-0000-4000-8000-000000000010",
    }))?.principal ?? null;
    analystUser = (await getPrincipalStateByUserId(analystUserId, {
      correlationId: "00000000-0000-4000-8000-000000000011",
    }))?.principal ?? null;
    REDACTED_CLIENT_DATAViewerUser = (await getPrincipalStateByUserId(REDACTED_CLIENT_DATAViewerId, {
      activeOrganizationId: REDACTED_CLIENT_DATAOrganization.id,
      correlationId: "00000000-0000-4000-8000-000000000012",
    }))?.principal ?? null;
    REDACTED_CLIENT_DATAViewerUser = (await getPrincipalStateByUserId(REDACTED_CLIENT_DATAViewerId, {
      correlationId: "00000000-0000-4000-8000-000000000013",
    }))?.principal ?? null;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  });

  it("returns null for disabled users", async () => {
    expect(disabledViewerId).not.toBeNull();
    expect(await getPrincipalStateByUserId(disabledViewerId!)).toBeNull();
  });

  it("builds platform admin permissions and global access", async () => {
    expect(platformAdminUser).toMatchObject({
      kind: "platform-admin",
      correlationId: "00000000-0000-4000-8000-000000000010",
    });
    expect(hasPermission(platformAdminUser!, "platform:manage")).toBe(true);
    expect(await projectService.getProjectAccessForUser(platformAdminUser!, "REDACTED_CLIENT_DATA")).not.toBeNull();
    expect(await projectService.getProjectAccessForUser(platformAdminUser!, "REDACTED_CLIENT_DATA")).not.toBeNull();
  });

  it("allows analyst to read every project", async () => {
    expect(analystUser).not.toBeNull();
    expect(await projectService.getProjectAccessForUser(analystUser!, "REDACTED_CLIENT_DATA")).not.toBeNull();
    expect(await projectService.getProjectAccessForUser(analystUser!, "REDACTED_CLIENT_DATA")).not.toBeNull();
  });

  it("loads current memberships and validates active organization", () => {
    expect(REDACTED_CLIENT_DATAViewerUser).toMatchObject({
      kind: "tenant-user",
      organizationId: expect.any(String),
      role: "VIEWER",
    });
    expect(hasPermission(REDACTED_CLIENT_DATAViewerUser!, "project:read:organization")).toBe(true);
    expect(hasPermission(REDACTED_CLIENT_DATAViewerUser!, "report:read:organization")).toBe(true);
  });

  it("allows client viewer only inside own organization project", async () => {
    expect(REDACTED_CLIENT_DATAViewerUser).not.toBeNull();
    expect(await projectService.getProjectAccessForUser(REDACTED_CLIENT_DATAViewerUser!, "REDACTED_CLIENT_DATA")).not.toBeNull();
    expect(await projectService.getProjectAccessForUser(REDACTED_CLIENT_DATAViewerUser!, "REDACTED_CLIENT_DATA")).toBeNull();
  });

  it("denies foreign site access for another client viewer", async () => {
    expect(REDACTED_CLIENT_DATAViewerUser).not.toBeNull();
    expect(await projectService.getSiteAccessForUser(REDACTED_CLIENT_DATAViewerUser!, "REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA")).toBeNull();
    expect(await projectService.getSiteAccessForUser(REDACTED_CLIENT_DATAViewerUser!, "REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA")).not.toBeNull();
  });
});
