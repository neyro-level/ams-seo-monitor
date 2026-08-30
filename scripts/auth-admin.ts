import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, SystemRole } from "@prisma/client";
import { createLocalAccountIssuer } from "better-auth/db";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import { createPgPoolConfigFromEnvironment } from "../src/infrastructure/database/prisma/pool-config";

type AuthAdminCommand =
  | "create"
  | "disable"
  | "set-system-role"
  | "add-to-organization"
  | "remove-from-organization";

const command = process.argv[2] as AuthAdminCommand | undefined;
const args = process.argv.slice(3);
const options: Record<string, string> = {};

for (let index = 0; index < args.length; index += 1) {
  const current = args[index];
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

const pool = new Pool(
  createPgPoolConfigFromEnvironment({
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_HOST: process.env.DATABASE_HOST,
    DATABASE_PORT: process.env.DATABASE_PORT,
    DATABASE_USER: process.env.DATABASE_USER,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
    DATABASE_NAME: process.env.DATABASE_NAME,
    DATABASE_SSLMODE: process.env.DATABASE_SSLMODE,
  }),
);
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function requireOption(name: string) {
  const value = options[name];
  if (!value) {
    throw new Error(`Missing required option --${name}`);
  }
  return value;
}

function parseSystemRole(value: string) {
  if (value === SystemRole.SEO_ANALYST || value === SystemRole.CLIENT_VIEWER) {
    return value;
  }
  throw new Error(`Unsupported system role: ${value}`);
}

async function createUser() {
  const email = requireOption("email").toLowerCase();
  const name = requireOption("name");
  const password = requireOption("password");
  const systemRole = parseSystemRole(options["system-role"] ?? SystemRole.CLIENT_VIEWER);
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new Error(`User already exists: ${email}`);
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      id: userId,
      email,
      name,
      emailVerified: false,
      systemRole,
    },
  });

  await prisma.account.create({
    data: {
      id: randomUUID(),
      userId,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      accountId: userId,
      password: passwordHash,
    },
  });

  console.log(`created_user=${email}`);
}

async function disableUser() {
  const email = requireOption("email").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const lockedPassword = await hashPassword(randomUUID());

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: user.id } }),
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

  console.log(`disabled_user=${email}`);
}

async function setSystemRole() {
  const email = requireOption("email").toLowerCase();
  const systemRole = parseSystemRole(requireOption("system-role"));
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { systemRole, disabledAt: null },
  });

  console.log(`updated_system_role=${email}`);
}

async function addToOrganization() {
  const email = requireOption("email").toLowerCase();
  const organizationSlug = requireOption("organization");
  const role = options["role"] ?? "client_viewer";
  const user = await prisma.user.findUnique({ where: { email } });
  const organization = await prisma.organization.findUnique({ where: { slug: organizationSlug } });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

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
    update: { role },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role,
    },
  });

  console.log(`organization_member=${organizationSlug}:${email}`);
}

async function removeFromOrganization() {
  const email = requireOption("email").toLowerCase();
  const organizationSlug = requireOption("organization");
  const user = await prisma.user.findUnique({ where: { email } });
  const organization = await prisma.organization.findUnique({ where: { slug: organizationSlug } });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  if (!organization) {
    throw new Error(`Organization not found: ${organizationSlug}`);
  }

  await prisma.$transaction([
    prisma.member.deleteMany({
      where: {
        organizationId: organization.id,
        userId: user.id,
      },
    }),
    prisma.session.updateMany({
      where: {
        userId: user.id,
        activeOrganizationId: organization.id,
      },
      data: {
        activeOrganizationId: null,
      },
    }),
  ]);

  console.log(`organization_member_removed=${organizationSlug}:${email}`);
}

async function main() {
  switch (command) {
    case "create":
      await createUser();
      return;
    case "disable":
      await disableUser();
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
    await prisma.$disconnect();
    await pool.end();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
