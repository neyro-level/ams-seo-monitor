import { MembershipRole, SystemRole } from "../src/generated/prisma/client.ts";
import { createPrismaContext } from "../src/platform/database/prisma/context.ts";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { parseSystemRole } from "../src/modules/identity-access/index.ts";
import {
  createUserSetupToken,
  getUserSetupTokenExpiry,
  hashUserSetupToken,
} from "../src/platform/auth/setup-token.ts";

type AuthAdminCommand =
  | "create"
  | "disable"
  | "revoke-setup-token"
  | "set-system-role"
  | "add-to-organization"
  | "remove-from-organization";

const command = process.argv[2] as AuthAdminCommand | undefined;
const args = process.argv.slice(3);
const options: Record<string, string> = {};

for (let index = 0; index < args.length; index += 1) {
  const current = args[index];
  if (current === "--") {
    continue;
  }
  if (!current.startsWith("--")) {
    throw new Error(`Unexpected argument: ${current}`);
  }
  const key = current.slice(2);
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for --${key}`);
  }
  options[key] = value;
  index += 1;
}

const database = createPrismaContext({
  APP_ENV: process.env.APP_ENV,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_PORT: process.env.DATABASE_PORT,
  DATABASE_USER: process.env.DATABASE_USER,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
  DATABASE_NAME: process.env.DATABASE_NAME,
  DATABASE_SSLMODE: process.env.DATABASE_SSLMODE,
});
const { prisma } = database;

function requireOption(name: string) {
  const value = options[name];
  if (!value) {
    throw new Error(`Missing required option --${name}`);
  }
  return value;
}

function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    throw new Error("Username must contain 3-30 lowercase Latin letters, digits, or underscores");
  }
  return username;
}

function requireUsername() {
  return normalizeUsername(requireOption("username"));
}

function requireCreatorId() {
  const value = requireOption("created-by").trim();
  if (!/^[a-zA-Z0-9_.:@-]{2,120}$/.test(value)) {
    throw new Error("--created-by must be a 2-120 character nonsecret operator identifier");
  }
  return value;
}

async function findUserByUsername(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw new Error(`User not found: ${username}`);
  }
  return user;
}

function parseTenantRole(value: string | undefined): MembershipRole {
  if (!value || value === "VIEWER") return MembershipRole.VIEWER;
  if (value === "ORG_OWNER") return MembershipRole.ORG_OWNER;
  if (value === "ORG_MEMBER") return MembershipRole.ORG_MEMBER;
  throw new Error("--tenant-role must be ORG_OWNER, ORG_MEMBER or VIEWER");
}

async function createUser() {
  const username = requireUsername();
  const email = (options.email ?? `${username}@users.impulse.invalid`).toLowerCase();
  const name = requireOption("name");
  const createdBy = requireCreatorId();
  if (options.password !== undefined) {
    throw new Error("--password is forbidden; user:create issues a one-time setup token");
  }
  const systemRole = parseSystemRole(options["system-role"] ?? SystemRole.CLIENT_VIEWER);
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    throw new Error(`User already exists: ${username}`);
  }

  const userId = randomUUID();
  const rawSetupToken = createUserSetupToken();
  const setupTokenId = randomUUID();
  const expiresAt = getUserSetupTokenExpiry();

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        username,
        email,
        name,
        emailVerified: false,
        systemRole,
        mustChangePassword: true,
      },
    }),
    prisma.userSetupToken.create({
      data: {
        id: setupTokenId,
        userId,
        tokenHash: hashUserSetupToken(rawSetupToken),
        expiresAt,
        createdBy,
      },
    }),
  ]);

  console.log(`created_user=${username}`);
  console.log(`setup_token_id=${setupTokenId}`);
  console.log(`setup_path=/setup/#${rawSetupToken}`);
  console.log(`setup_expires_at=${expiresAt.toISOString()}`);
}

async function revokeSetupToken() {
  const tokenId = requireOption("token-id");
  const revokedAt = new Date();
  const result = await prisma.userSetupToken.updateMany({
    where: { id: tokenId, usedAt: null, revokedAt: null },
    data: { revokedAt },
  });
  if (result.count !== 1) {
    throw new Error("Setup token not found or already unavailable");
  }
  console.log(`revoked_setup_token=${tokenId}`);
}

async function disableUser() {
  const username = requireUsername();
  const user = await findUserByUsername(username);
  const lockedPassword = await hashPassword(randomUUID());

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.userSetupToken.updateMany({
      where: { userId: user.id, usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.account.updateMany({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      data: {
        password: lockedPassword,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { disabledAt: new Date() },
    }),
  ]);

  console.log(`disabled_user=${username}`);
}

async function setSystemRole() {
  const username = requireUsername();
  const systemRole = parseSystemRole(requireOption("system-role"));
  const user = await findUserByUsername(username);

  await prisma.user.update({
    where: { id: user.id },
    data: { systemRole },
  });

  console.log(`updated_system_role=${username}`);
}

async function addToOrganization() {
  const username = requireUsername();
  const organizationSlug = requireOption("organization");
  const tenantRole = parseTenantRole(options["tenant-role"]);
  const user = await findUserByUsername(username);
  const organization = await prisma.organization.findUnique({ where: { slug: organizationSlug } });

  if (!organization) {
    throw new Error(`Organization not found: ${organizationSlug}`);
  }

  await prisma.member.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: { tenantRole },
    create: {
      organizationId: organization.id,
      userId: user.id,
      tenantRole,
    },
  });

  console.log(`organization_member=${organizationSlug}:${username}`);
}

async function removeFromOrganization() {
  const username = requireUsername();
  const organizationSlug = requireOption("organization");
  const user = await findUserByUsername(username);
  const organization = await prisma.organization.findUnique({ where: { slug: organizationSlug } });

  if (!organization) {
    throw new Error(`Organization not found: ${organizationSlug}`);
  }

  await prisma.member.deleteMany({
    where: {
      organizationId: organization.id,
      userId: user.id,
    },
  });

  console.log(`organization_member_removed=${organizationSlug}:${username}`);
}

async function main() {
  switch (command) {
    case "create":
      await createUser();
      return;
    case "disable":
      await disableUser();
      return;
    case "revoke-setup-token":
      await revokeSetupToken();
      return;
    case "set-system-role":
      await setSystemRole();
      return;
    case "add-to-organization":
      await addToOrganization();
      return;
    case "remove-from-organization":
      await removeFromOrganization();
      return;
    default:
      throw new Error(`Unsupported command: ${command ?? "<missing>"}`);
  }
}

main()
  .finally(async () => {
    await database.close();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
