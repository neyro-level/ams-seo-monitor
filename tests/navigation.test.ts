import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaContext } from "../src/infrastructure/database/prisma/context";
import { buildNavigation } from "../src/modules/access/navigation";

const navigationTestEnabled = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME,
);
const navigationTestDescription = navigationTestEnabled ? describe : describe.skip;

const analystUser = {
  userId: "analyst-1",
  email: "analyst@test.local",
  name: "Analyst",
  systemRole: "SEO_ANALYST" as const,
  activeOrganizationId: null,
};

const clientViewerUser = {
  userId: "navigation-viewer-1",
  email: "viewer@test.local",
  name: "Viewer",
  systemRole: "CLIENT_VIEWER" as const,
  activeOrganizationId: null,
};

navigationTestDescription("database-backed navigation isolation", () => {
  let database: ReturnType<typeof createPrismaContext> | null = null;

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
      where: { slug: "REDACTED_CLIENT_DATA" },
      select: { id: true },
    });
    await database.prisma.user.upsert({
      where: { id: clientViewerUser.userId },
      update: { disabledAt: null, systemRole: "CLIENT_VIEWER" },
      create: {
        id: clientViewerUser.userId,
        email: clientViewerUser.email,
        name: clientViewerUser.name,
        emailVerified: false,
        systemRole: "CLIENT_VIEWER",
      },
    });
    await database.prisma.member.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: clientViewerUser.userId,
        },
      },
      update: { role: "client_viewer" },
      create: {
        organizationId: organization.id,
        userId: clientViewerUser.userId,
        role: "client_viewer",
      },
    });
  });

  afterAll(async () => {
    if (!database) return;
    await database.prisma.member.deleteMany({ where: { userId: clientViewerUser.userId } });
    await database.prisma.user.deleteMany({ where: { id: clientViewerUser.userId } });
    await database.close();
  });
  it("renders only the current client subtree on a client route", async () => {
    const sections = await buildNavigation("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/", clientViewerUser);
    const items = sections.flatMap((section) => section.items);

    expect(sections).toHaveLength(2);
    expect(items.map((item) => item.label)).toEqual(["Мои проекты", "Проект REDACTED_CLIENT_DATA"]);
    expect(items[1]?.children?.map((item) => item.label)).toEqual([
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
    ]);
    expect(JSON.stringify(sections)).not.toContain("Союз застройщиков");
    expect(items[0]?.active).toBe(false);
  });

  it("renders all projects directly on the analyst root", async () => {
    const sections = await buildNavigation("/analyst/", analystUser);
    const serialized = JSON.stringify(sections);
    const mainItems = sections[0]?.items ?? [];
    const projectItems = sections[1]?.items ?? [];

    expect(sections[0]?.title).toBe("");
    expect(mainItems.map((item) => item.label)).toEqual(["Все проекты"]);
    expect(mainItems[0]?.active).toBe(true);
    expect(projectItems.map((item) => item.label)).toEqual([
      "Проект REDACTED_CLIENT_DATA",
      "Проект Союз застройщиков",
    ]);
    expect(serialized).not.toContain("Общий кабинет");
  });
});
