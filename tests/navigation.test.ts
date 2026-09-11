import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaContext } from "../src/platform/database/prisma/context.ts";
import { buildNavigation } from "../src/modules/project-registry/presentation.ts";
import { getPrincipalStateByUserId } from "../src/platform/authorization/principal-factories.ts";
import type { PrincipalContext } from "../src/platform/authorization/principal.ts";
import { createPlatformAnalystPrincipal } from "./helpers/principal.ts";

const navigationTestEnabled = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME,
);
const navigationTestDescription = navigationTestEnabled ? describe : describe.skip;

let analystPrincipal: PrincipalContext = createPlatformAnalystPrincipal("analyst-1");

const clientViewerIdentity = {
  userId: "navigation-viewer-1",
  email: "viewer@test.local",
  name: "Viewer",
};

navigationTestDescription("database-backed navigation isolation", () => {
  let database: ReturnType<typeof createPrismaContext> | null = null;
  let clientViewerPrincipal: PrincipalContext | null = null;

  beforeAll(async () => {
    database = createPrismaContext({
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_HOST: process.env.DATABASE_HOST,
      DATABASE_PORT: process.env.DATABASE_PORT,
      DATABASE_USER: process.env.DATABASE_USER,
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
      DATABASE_NAME: process.env.DATABASE_NAME,
      DATABASE_SSLMODE: process.env.DATABASE_SSLMODE,
    });
    const organization = await database.prisma.organization.findUniqueOrThrow({
      where: { slug: "alpha" },
      include: { projects: { select: { id: true } } },
    });
    await database.prisma.user.upsert({
      where: { id: clientViewerIdentity.userId },
      update: { disabledAt: null, systemRole: "CLIENT" },
      create: {
        id: clientViewerIdentity.userId,
        email: clientViewerIdentity.email,
        name: clientViewerIdentity.name,
        emailVerified: false,
        systemRole: "CLIENT",
      },
    });
    await database.prisma.user.upsert({
      where: { id: "analyst-1" },
      update: { disabledAt: null, systemRole: "ANALYST" },
      create: {
        id: "analyst-1",
        email: "navigation-analyst@test.local",
        name: "Navigation analyst",
        emailVerified: false,
        systemRole: "ANALYST",
      },
    });
    const clientMembership = await database.prisma.member.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: clientViewerIdentity.userId,
        },
      },
      update: { tenantRole: "VIEWER" },
      create: {
        organizationId: organization.id,
        userId: clientViewerIdentity.userId,
        tenantRole: "VIEWER",
      },
    });
    await database.prisma.seoProjectAccess.createMany({
      data: organization.projects.map((project) => ({
        membershipId: clientMembership.id,
        organizationId: organization.id,
        projectId: project.id,
        role: "VIEWER" as const,
      })),
      skipDuplicates: true,
    });
    const analystOrganizations = await database.prisma.organization.findMany({
      where: { slug: { in: ["alpha", "beta"] } },
      select: { id: true, projects: { select: { id: true } } },
    });
    const analystMemberships = await Promise.all(analystOrganizations.map(async (item) => ({
      id: (await database!.prisma.member.upsert({
        where: { organizationId_userId: { organizationId: item.id, userId: "analyst-1" } },
        update: { tenantRole: "VIEWER" },
        create: { organizationId: item.id, userId: "analyst-1", tenantRole: "VIEWER" },
        select: { id: true },
      })).id,
      organizationId: item.id,
      organization: { projects: item.projects },
    })));
    await database.prisma.seoProjectAccess.createMany({
      data: analystMemberships.flatMap((membership) => membership.organization.projects.map((project) => ({
        membershipId: membership.id,
        organizationId: membership.organizationId,
        projectId: project.id,
        role: "ANALYST" as const,
      }))),
      skipDuplicates: true,
    });
    analystPrincipal = (await getPrincipalStateByUserId("analyst-1", {
      correlationId: "00000000-0000-4000-8000-000000000001",
    }))?.principal ?? analystPrincipal;
    clientViewerPrincipal = (await getPrincipalStateByUserId(clientViewerIdentity.userId, {
      correlationId: "00000000-0000-4000-8000-000000000002",
    }))?.principal ?? null;
    if (!clientViewerPrincipal) throw new Error("Missing client viewer PrincipalContext");
  });

  afterAll(async () => {
    if (!database) return;
    await database.prisma.member.deleteMany({ where: { userId: { in: [clientViewerIdentity.userId, "analyst-1"] } } });
    await database.prisma.user.deleteMany({ where: { id: { in: [clientViewerIdentity.userId, "analyst-1"] } } });
    await database.close();
  });
  it("keeps all available projects visible on a client route", async () => {
    const sections = await buildNavigation("/c/alpha/north/", clientViewerPrincipal!);
    const items = sections.flatMap((section) => section.items);

    expect(sections.map((section) => section.title)).toEqual(["Система", "Продукты", "SEO-проекты"]);
    expect(items.map((item) => item.label)).toEqual([
      "Мои проекты",
      "SEO Монитор",
      "Synthetic Alpha Organization",
    ]);
    expect(items[2]?.children?.map((item) => item.label)).toEqual([
      "Synthetic site 2",
      "Synthetic site 1",
      "Synthetic site 3",
    ]);
    expect(JSON.stringify(sections)).not.toContain("Synthetic Beta Organization");
    expect(items[0]?.active).toBe(false);
  });

  it("renders only explicitly assigned projects on the analyst dashboard", async () => {
    const sections = await buildNavigation("/dashboard/", analystPrincipal);
    const serialized = JSON.stringify(sections);
    const mainItems = sections[0]?.items ?? [];

    expect(sections.map((section) => section.title)).toEqual(["Система", "Продукты", "SEO-проекты"]);
    expect(mainItems.map((item) => item.label)).toEqual(["Мои проекты", "Уведомления"]);
    expect(mainItems[0]?.active).toBe(true);
    expect(sections[1]?.items.map((item) => item.label)).toEqual(["SEO Монитор"]);
    expect(sections[2]?.items.map((item) => item.label)).toEqual([
      "Synthetic Alpha Organization",
      "Synthetic Beta Organization",
    ]);
    expect(serialized).not.toContain("Общий кабинет");
  });
});
