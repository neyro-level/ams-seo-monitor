import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPgPoolConfigFromEnvironment } from "../src/infrastructure/database/prisma/pool-config";
import { AdminCmsService } from "../src/modules/admin-cms";
import { PrismaAdminRepository } from "../src/modules/admin-cms/server";
import { createActorContext } from "./helpers/actor-context";

const integrationEnabled = Boolean(
  process.env.TEST_DATABASE_HOST &&
    process.env.TEST_DATABASE_USER &&
    process.env.TEST_DATABASE_PASSWORD &&
    process.env.TEST_DATABASE_NAME,
);
const integrationDescription = integrationEnabled ? describe : describe.skip;
const suffix = "admin-cms-integration";
const actor = createActorContext({
  userId: "admin-cms-integration-actor",
  systemRole: "PLATFORM_ADMIN",
  correlationId: "00000000-0000-4000-8000-000000000050",
});

integrationDescription("Admin CMS audited commands", () => {
  let prisma: PrismaClient;
  let pool: Pool;
  let service: AdminCmsService;
  let organizationId = "";
  let projectId = "";
  let siteId = "";

  beforeAll(async () => {
    pool = new Pool(
      createPgPoolConfigFromEnvironment({
        DATABASE_HOST: process.env.TEST_DATABASE_HOST,
        DATABASE_PORT: process.env.TEST_DATABASE_PORT,
        DATABASE_USER: process.env.TEST_DATABASE_USER,
        DATABASE_PASSWORD: process.env.TEST_DATABASE_PASSWORD,
        DATABASE_NAME: process.env.TEST_DATABASE_NAME,
        DATABASE_SSLMODE: process.env.TEST_DATABASE_SSLMODE,
      }),
    );
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    service = new AdminCmsService(new PrismaAdminRepository(prisma));
    await cleanup();
  });

  async function cleanup() {
    const organization = await prisma.organization.findUnique({ where: { slug: suffix }, select: { id: true } });
    const project = await prisma.project.findUnique({ where: { slug: suffix }, select: { id: true } });
    const site = project
      ? await prisma.site.findUnique({ where: { projectId_slug: { projectId: project.id, slug: suffix } }, select: { id: true } })
      : null;
    if (site) {
      await prisma.trackedQuerySet.deleteMany({ where: { siteId: site.id } });
      await prisma.providerConnection.deleteMany({ where: { siteId: site.id } });
      await prisma.site.delete({ where: { id: site.id } });
    }
    if (project) {
      await prisma.goalDefinition.deleteMany({ where: { projectId: project.id } });
      await prisma.project.delete({ where: { id: project.id } });
    }
    if (organization) {
      await prisma.member.deleteMany({ where: { organizationId: organization.id } });
      await prisma.auditEvent.deleteMany({ where: { organizationId: organization.id } });
      await prisma.organization.delete({ where: { id: organization.id } });
    }
    await prisma.auditEvent.deleteMany({ where: { actorId: actor.userId } });
    await prisma.user.deleteMany({ where: { email: `${suffix}@example.invalid` } });
    await prisma.queryClusterProfile.deleteMany({ where: { slug: suffix } });
    await prisma.thresholdProfile.deleteMany({ where: { slug: suffix } });
  }

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await pool.end();
  });

  it("commits named resource mutations with one safe audit event each", async () => {
    const thresholdId = await service.saveThresholdProfile(actor, {
      slug: suffix,
      minimumShows: 10,
      maximumCtrPercent: 2,
      maximumAveragePosition: 20,
      showsDropPercent: 10,
      clicksDropPercent: 10,
      positionWorsenedDelta: 3,
      pagesInSearchDropPercent: 10,
      organicVisitsDropPercent: 10,
      goalConversionDropPercent: 10,
    });
    const clusterId = await service.saveClusterProfile(actor, {
      slug: suffix,
      name: "Integration clusters",
      groups: [{ slug: "brand", label: "Бренд", order: 1, brandTerms: ["ams"], terms: [] }],
    });
    organizationId = await service.saveOrganization(actor, { slug: suffix, name: "Integration organization" });
    const user = await prisma.user.create({
      data: {
        id: `${suffix}-user`,
        name: "Integration member",
        email: `${suffix}@example.invalid`,
        systemRole: "CLIENT_VIEWER",
      },
    });
    await service.saveMembership(actor, { organizationId, userId: user.id, role: "client_viewer" });
    await service.removeMembership(actor, { organizationId, userId: user.id });
    expect(
      await prisma.member.findUnique({
        where: {
          organizationId_userId: { organizationId, userId: user.id },
        },
      }),
    ).toBeNull();
    projectId = await service.saveProject(actor, {
      organizationId,
      slug: suffix,
      name: "Integration project",
      status: "PLANNED",
      thresholdProfileId: thresholdId,
      clusterProfileId: clusterId,
    });
    siteId = await service.saveSite(actor, {
      projectId,
      slug: suffix,
      name: "Integration site",
      url: "https://integration.example.invalid",
      timezone: "Europe/Moscow",
      enabled: true,
    });
    await service.saveProviderConnection(actor, {
      siteId,
      provider: "YANDEX_WEBMASTER",
      externalId: "integration-host",
      enabled: true,
      settings: { hostUrl: "https://integration.example.invalid" },
    });
    await service.saveGoal(actor, {
      projectId,
      externalGoalId: "goal-1",
      label: "Integration goal",
      category: "LEAD_SUBMIT",
      direction: "PRIMARY",
      includeInSeoConversion: true,
    });
    await service.replaceTrackedQuerySet(actor, {
      siteId,
      source: "OWNER_PROVIDED",
      baselineLabel: "Integration baseline",
      queries: ["seo аудит", "seo продвижение"],
    });
    await service.replaceTrackedQuerySet(actor, {
      siteId,
      source: "OWNER_PROVIDED",
      baselineLabel: "Updated baseline",
      queries: ["seo аудит"],
    });
    const retainedQueries = await prisma.trackedQuery.findMany({
      where: { trackedQuerySet: { siteId } },
      orderBy: { normalizedQuery: "asc" },
      select: { normalizedQuery: true, enabled: true },
    });
    expect(retainedQueries).toEqual([
      { normalizedQuery: "seo аудит", enabled: true },
      { normalizedQuery: "seo продвижение", enabled: false },
    ]);

    const audit = await prisma.auditEvent.findMany({
      where: { actorId: actor.userId },
      orderBy: { createdAt: "asc" },
      select: { action: true, source: true, correlationId: true },
    });
    expect(audit).toHaveLength(11);
    expect(audit.map((event) => event.action)).toEqual([
      "threshold-profile.save",
      "cluster-profile.save",
      "organization.create",
      "membership.save",
      "membership.remove",
      "project.create",
      "site.create",
      "provider-connection.save",
      "goal.save",
      "tracked-query-set.replace",
      "tracked-query-set.replace",
    ]);
    expect(audit.every((event) => event.source === "admin-cms" && event.correlationId === actor.correlationId)).toBe(true);
  });

  it("keeps project and site ownership immutable", async () => {
    const [project, otherProject] = await Promise.all([
      prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
      prisma.project.findUniqueOrThrow({ where: { slug: "REDACTED_CLIENT_DATA" } }),
    ]);
    const before = await prisma.auditEvent.count({ where: { actorId: actor.userId } });

    await expect(
      service.saveProject(actor, {
        id: project.id,
        organizationId: otherProject.organizationId,
        slug: project.slug,
        name: project.name,
        status: project.status,
        thresholdProfileId: project.thresholdProfileId,
        clusterProfileId: project.clusterProfileId,
      }),
    ).rejects.toThrow("PROJECT_ORGANIZATION_IMMUTABLE");
    await expect(
      service.saveSite(actor, {
        id: siteId,
        projectId: otherProject.id,
        slug: suffix,
        name: "Integration site",
        url: "https://integration.example.invalid",
        timezone: "Europe/Moscow",
        enabled: true,
      }),
    ).rejects.toThrow("SITE_PROJECT_IMMUTABLE");

    expect(await prisma.auditEvent.count({ where: { actorId: actor.userId } })).toBe(before);
    expect(await prisma.project.findUniqueOrThrow({ where: { id: projectId } })).toMatchObject({
      organizationId,
    });
    expect(await prisma.site.findUniqueOrThrow({ where: { id: siteId } })).toMatchObject({
      projectId,
    });
  });

  it("rolls back audit when a resource mutation fails", async () => {
    const before = await prisma.auditEvent.count({ where: { actorId: actor.userId } });
    await expect(service.saveProject(actor, {
      organizationId,
      slug: `${suffix}-invalid`,
      name: "Invalid project",
      status: "PLANNED",
      thresholdProfileId: "missing-threshold",
      clusterProfileId: "missing-cluster",
    })).rejects.toThrow();
    expect(await prisma.auditEvent.count({ where: { actorId: actor.userId } })).toBe(before);
    expect(await prisma.project.findUnique({ where: { slug: `${suffix}-invalid` } })).toBeNull();
  });

  it("denies mutations without platform capability", async () => {
    const viewer = createActorContext({ systemRole: "CLIENT_VIEWER" });
    expect(() => service.saveOrganization(viewer, { slug: `${suffix}-denied`, name: "Denied" })).toThrow("ADMIN_ACCESS_DENIED");
    expect(await prisma.organization.findUnique({ where: { slug: `${suffix}-denied` } })).toBeNull();
  });
});
