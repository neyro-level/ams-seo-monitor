import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts"
import { getPrismaClient } from "../../../platform/database/prisma/client.ts";
import type { AdminResourceKey } from "../domain/resources.ts";
import type {
  AdminDashboardSummary,
  AdminFormOptions,
  AdminListQuery,
  AdminRepository,
  AdminResourcePage,
  AdminResourceRow,
  AuditContext,
  ReplaceTrackedQuerySetInput,
  RemoveMembershipInput,
  SaveClusterProfileInput,
  SaveGoalInput,
  SaveMembershipInput,
  SaveOrganizationInput,
  SaveProjectInput,
  SaveProviderConnectionInput,
  SaveSiteInput,
  SaveThresholdProfileInput,
} from "../application/ports/admin-repository.ts";

type TransactionClient = Prisma.TransactionClient;

type MutationResult = {
  id: string;
  organizationId: string | null;
  beforeMarker: Prisma.InputJsonObject;
  afterMarker: Prisma.InputJsonObject;
};

function pagination(query: AdminListQuery) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

function pageResult(
  rows: AdminResourceRow[],
  total: number,
  query: AdminListQuery,
): AdminResourcePage {
  return {
    rows,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

function timestamp(value: Date) {
  return value.toISOString();
}

function sortRows(rows: AdminResourceRow[], query: AdminListQuery) {
  const field = query.sort === "name" ? "primary" : query.sort === "status" ? "status" : "updatedAt";
  rows.sort((left, right) => {
    const comparison = left[field].localeCompare(right[field], "ru");
    return query.direction === "asc" ? comparison : -comparison;
  });
}

export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly injectedPrisma?: PrismaClient) {}

  private get prisma() {
    return this.injectedPrisma ?? getPrismaClient();
  }

  private async auditedMutation(
    audit: AuditContext,
    action: string,
    entityType: string,
    mutate: (tx: TransactionClient) => Promise<MutationResult>,
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const result = await mutate(tx);
      await tx.auditEvent.create({
        data: {
          organizationId: result.organizationId ?? audit.organizationId,
          actorType: "USER",
          actorId: audit.actorId,
          action,
          entityType,
          entityId: result.id,
          beforeMarker: result.beforeMarker,
          afterMarker: result.afterMarker,
          source: "admin-cms",
          correlationId: audit.correlationId,
        },
      });
      return result.id;
    });
  }

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    const [organizations, projects, sites, enabledProviders, runningSyncs, pendingJobs] =
      await this.prisma.$transaction([
        this.prisma.organization.count(),
        this.prisma.project.count(),
        this.prisma.site.count(),
        this.prisma.providerConnection.count({ where: { enabled: true } }),
        this.prisma.syncRun.count({ where: { status: "RUNNING" } }),
        this.prisma.outboxEvent.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
      ]);
    return { organizations, projects, sites, enabledProviders, runningSyncs, pendingJobs };
  }

  async getFormOptions(): Promise<AdminFormOptions> {
    const [organizations, users, projects, sites, thresholdProfiles, clusterProfiles] =
      await this.prisma.$transaction([
        this.prisma.organization.findMany({ orderBy: { name: "asc" }, take: 100 }),
        this.prisma.user.findMany({
          where: { disabledAt: null },
          orderBy: { name: "asc" },
          take: 100,
        }),
        this.prisma.project.findMany({ orderBy: { name: "asc" }, take: 100 }),
        this.prisma.site.findMany({
          include: { project: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: 200,
        }),
        this.prisma.thresholdProfile.findMany({ orderBy: { slug: "asc" }, take: 100 }),
        this.prisma.queryClusterProfile.findMany({ orderBy: { name: "asc" }, take: 100 }),
      ]);

    return {
      organizations: organizations.map((item) => ({ value: item.id, label: item.name })),
      users: users.map((item) => ({ value: item.id, label: `${item.name} · ${item.email}` })),
      projects: projects.map((item) => ({ value: item.id, label: item.name })),
      sites: sites.map((item) => ({
        value: item.id,
        label: `${item.project.name} · ${item.name}`,
      })),
      thresholdProfiles: thresholdProfiles.map((item) => ({
        value: item.id,
        label: item.slug,
      })),
      clusterProfiles: clusterProfiles.map((item) => ({ value: item.id, label: item.name })),
    };
  }

  async listResource(resource: AdminResourceKey, query: AdminListQuery): Promise<AdminResourcePage> {
    const search = query.search.trim();
    const direction = query.direction;
    const range = pagination(query);

    switch (resource) {
      case "organizations": {
        const where: Prisma.OrganizationWhereInput = search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] }
          : {};
        const orderBy: Prisma.OrganizationOrderByWithRelationInput =
          query.sort === "createdAt" || query.sort === "updatedAt"
            ? { [query.sort]: direction }
            : { name: direction };
        const [total, records] = await this.prisma.$transaction([
          this.prisma.organization.count({ where }),
          this.prisma.organization.findMany({ where, orderBy, ...range, include: { _count: { select: { members: true, projects: true } } } }),
        ]);
        return pageResult(records.map((item) => ({
          id: item.id,
          primary: item.name,
          secondary: `${item.slug} · ${item._count.projects} проектов · ${item._count.members} участников`,
          status: "Активна",
          updatedAt: timestamp(item.updatedAt),
        })), total, query);
      }
      case "memberships": {
        const where: Prisma.MemberWhereInput = search
          ? {
              OR: [
                { role: { contains: search, mode: "insensitive" } },
                { user: { name: { contains: search, mode: "insensitive" } } },
                { user: { email: { contains: search, mode: "insensitive" } } },
                { organization: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {};
        const orderBy: Prisma.MemberOrderByWithRelationInput =
          query.sort === "status"
            ? { role: direction }
            : query.sort === "name"
              ? { user: { name: direction } }
              : query.sort === "createdAt"
                ? { createdAt: direction }
                : { updatedAt: direction };
        const [total, records] = await this.prisma.$transaction([
          this.prisma.member.count({ where }),
          this.prisma.member.findMany({
            where,
            orderBy,
            ...range,
            include: {
              organization: { select: { name: true } },
              user: { select: { name: true, email: true } },
            },
          }),
        ]);
        return pageResult(
          records.map((item) => ({
            id: item.id,
            primary: item.user.name,
            secondary: `${item.user.email} · ${item.organization.name}`,
            status: item.role,
            updatedAt: timestamp(item.updatedAt),
          })),
          total,
          query,
        );
      }
      case "projects": {
        const where: Prisma.ProjectWhereInput = search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] }
          : {};
        const orderBy: Prisma.ProjectOrderByWithRelationInput =
          query.sort === "status" ? { status: direction } : query.sort === "createdAt" || query.sort === "updatedAt" ? { [query.sort]: direction } : { name: direction };
        const [total, records] = await this.prisma.$transaction([
          this.prisma.project.count({ where }),
          this.prisma.project.findMany({ where, orderBy, ...range, include: { organization: { select: { name: true } }, _count: { select: { sites: true } } } }),
        ]);
        return pageResult(records.map((item) => ({ id: item.id, primary: item.name, secondary: `${item.organization.name} · ${item.slug} · ${item._count.sites} сайтов`, status: item.status, updatedAt: timestamp(item.updatedAt) })), total, query);
      }
      case "sites": {
        const where: Prisma.SiteWhereInput = search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }, { url: { contains: search, mode: "insensitive" } }] }
          : {};
        const orderBy: Prisma.SiteOrderByWithRelationInput =
          query.sort === "status"
            ? { enabled: direction }
            : query.sort === "createdAt" || query.sort === "updatedAt"
              ? { [query.sort]: direction }
              : { name: direction };
        const [total, records] = await this.prisma.$transaction([
          this.prisma.site.count({ where }),
          this.prisma.site.findMany({ where, orderBy, ...range, include: { project: { select: { name: true } }, _count: { select: { providerConnections: true } } } }),
        ]);
        return pageResult(records.map((item) => ({ id: item.id, primary: item.name, secondary: `${item.project.name} · ${item.url} · ${item._count.providerConnections} источников`, status: item.enabled ? "Включён" : "Отключён", updatedAt: timestamp(item.updatedAt) })), total, query);
      }
      case "providers": {
        const where: Prisma.ProviderConnectionWhereInput = search
          ? { OR: [{ externalId: { contains: search, mode: "insensitive" } }, { site: { name: { contains: search, mode: "insensitive" } } }] }
          : {};
        const orderBy: Prisma.ProviderConnectionOrderByWithRelationInput =
          query.sort === "status"
            ? { enabled: direction }
            : query.sort === "name"
              ? { site: { name: direction } }
              : query.sort === "createdAt"
                ? { createdAt: direction }
                : { updatedAt: direction };
        const [total, records] = await this.prisma.$transaction([
          this.prisma.providerConnection.count({ where }),
          this.prisma.providerConnection.findMany({ where, orderBy, ...range, include: { site: { include: { project: { select: { name: true } } } } } }),
        ]);
        return pageResult(records.map((item) => ({ id: item.id, primary: `${item.site.name} · ${item.provider}`, secondary: `${item.site.project.name} · external ID: ${item.externalId ?? "не задан"}`, status: item.enabled ? "Включён" : "Отключён", updatedAt: timestamp(item.updatedAt) })), total, query);
      }
      case "goals": {
        const where: Prisma.GoalDefinitionWhereInput = search
          ? { OR: [{ label: { contains: search, mode: "insensitive" } }, { externalGoalId: { contains: search, mode: "insensitive" } }] }
          : {};
        const orderBy: Prisma.GoalDefinitionOrderByWithRelationInput =
          query.sort === "status"
            ? { includeInSeoConversion: direction }
            : query.sort === "name"
              ? { label: direction }
              : query.sort === "createdAt"
                ? { createdAt: direction }
                : { updatedAt: direction };
        const [total, records] = await this.prisma.$transaction([
          this.prisma.goalDefinition.count({ where }),
          this.prisma.goalDefinition.findMany({ where, orderBy, ...range, include: { project: { select: { name: true } } } }),
        ]);
        return pageResult(records.map((item) => ({ id: item.id, primary: item.label, secondary: `${item.project.name} · ${item.externalGoalId} · ${item.category}`, status: item.includeInSeoConversion ? "В SEO-конверсии" : item.direction, updatedAt: timestamp(item.updatedAt) })), total, query);
      }
      case "tracked-queries": {
        const where: Prisma.TrackedQuerySetWhereInput = search
          ? { OR: [{ baselineLabel: { contains: search, mode: "insensitive" } }, { site: { name: { contains: search, mode: "insensitive" } } }] }
          : {};
        const orderBy: Prisma.TrackedQuerySetOrderByWithRelationInput =
          query.sort === "status"
            ? { source: direction }
            : query.sort === "name"
              ? { site: { name: direction } }
              : query.sort === "createdAt"
                ? { createdAt: direction }
                : { updatedAt: direction };
        const [total, records] = await this.prisma.$transaction([
          this.prisma.trackedQuerySet.count({ where }),
          this.prisma.trackedQuerySet.findMany({ where, orderBy, ...range, include: { site: { include: { project: { select: { name: true } } } }, _count: { select: { queries: true } } } }),
        ]);
        return pageResult(records.map((item) => ({ id: item.id, primary: item.site.name, secondary: `${item.site.project.name} · ${item.baselineLabel} · ${item._count.queries} запросов`, status: item.source, updatedAt: timestamp(item.updatedAt) })), total, query);
      }
      case "profiles":
        return this.listProfiles(query);
      case "operations":
        return this.listOperations(query);
    }
  }

  private async listProfiles(query: AdminListQuery): Promise<AdminResourcePage> {
    const [thresholds, clusters] = await this.prisma.$transaction([
      this.prisma.thresholdProfile.findMany({ orderBy: { updatedAt: "desc" } }),
      this.prisma.queryClusterProfile.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { groups: true } } } }),
    ]);
    const search = query.search.toLocaleLowerCase("ru");
    const rows: AdminResourceRow[] = [
      ...thresholds.map((item) => ({ id: item.id, primary: item.slug, secondary: `Пороговый профиль · минимум показов ${item.minimumShows}`, status: "THRESHOLD", updatedAt: timestamp(item.updatedAt) })),
      ...clusters.map((item) => ({ id: item.id, primary: item.name, secondary: `${item.slug} · ${item._count.groups} групп`, status: "CLUSTER", updatedAt: timestamp(item.updatedAt) })),
    ].filter((item) => !search || `${item.primary} ${item.secondary}`.toLocaleLowerCase("ru").includes(search));
    sortRows(rows, query);
    return pageResult(rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), rows.length, query);
  }

  private async listOperations(query: AdminListQuery): Promise<AdminResourcePage> {
    const [syncRuns, outboxEvents] = await this.prisma.$transaction([
      this.prisma.syncRun.findMany({ orderBy: { startedAt: "desc" }, take: 200 }),
      this.prisma.outboxEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    ]);
    const search = query.search.toLocaleLowerCase("ru");
    const rows: AdminResourceRow[] = [
      ...syncRuns.map((item) => ({ id: item.id, primary: `Sync ${item.trigger}`, secondary: `${item.sitesProcessed} сайтов · ${item.safeError ?? "без ошибки"}`, status: item.status, updatedAt: timestamp(item.updatedAt) })),
      ...outboxEvents.map((item) => ({ id: item.id, primary: item.topic, secondary: `Попыток: ${item.attempts} · ${item.lastErrorCode ?? "без ошибки"}`, status: item.status, updatedAt: timestamp(item.updatedAt) })),
    ].filter((item) => !search || `${item.primary} ${item.secondary} ${item.status}`.toLocaleLowerCase("ru").includes(search));
    sortRows(rows, query);
    return pageResult(rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), rows.length, query);
  }

  saveOrganization(input: SaveOrganizationInput, audit: AuditContext) {
    return this.auditedMutation(audit, input.id ? "organization.update" : "organization.create", "Organization", async (tx) => {
      const record = input.id
        ? await tx.organization.update({ where: { id: input.id }, data: { slug: input.slug, name: input.name } })
        : await tx.organization.create({ data: { slug: input.slug, name: input.name } });
      return { id: record.id, organizationId: record.id, beforeMarker: { existed: Boolean(input.id) }, afterMarker: { slug: record.slug, name: record.name } };
    });
  }

  saveMembership(input: SaveMembershipInput, audit: AuditContext) {
    return this.auditedMutation(audit, "membership.save", "Member", async (tx) => {
      const record = await tx.member.upsert({
        where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } },
        update: { role: input.role },
        create: input,
      });
      return { id: record.id, organizationId: input.organizationId, beforeMarker: { membership: "existing-or-new" }, afterMarker: { userId: input.userId, role: input.role } };
    });
  }

  removeMembership(input: RemoveMembershipInput, audit: AuditContext) {
    return this.auditedMutation(audit, "membership.remove", "Member", async (tx) => {
      const record = await tx.member.delete({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.userId,
          },
        },
      });
      return {
        id: record.id,
        organizationId: input.organizationId,
        beforeMarker: { userId: record.userId, role: record.role },
        afterMarker: { removed: true },
      };
    });
  }

  saveProject(input: SaveProjectInput, audit: AuditContext) {
    return this.auditedMutation(
      audit,
      input.id ? "project.update" : "project.create",
      "Project",
      async (tx) => {
        const existing = input.id
          ? await tx.project.findUniqueOrThrow({
              where: { id: input.id },
              select: { organizationId: true },
            })
          : null;
        if (existing && existing.organizationId !== input.organizationId) {
          throw new Error("PROJECT_ORGANIZATION_IMMUTABLE");
        }
        const data = {
          organizationId: input.organizationId,
          slug: input.slug,
          name: input.name,
          status: input.status,
          thresholdProfileId: input.thresholdProfileId,
          clusterProfileId: input.clusterProfileId,
        };
        const record = input.id
          ? await tx.project.update({ where: { id: input.id }, data })
          : await tx.project.create({ data });
        return {
          id: record.id,
          organizationId: record.organizationId,
          beforeMarker: { existed: Boolean(existing) },
          afterMarker: {
            slug: record.slug,
            name: record.name,
            status: record.status,
          },
        };
      },
    );
  }

  saveSite(input: SaveSiteInput, audit: AuditContext) {
    return this.auditedMutation(
      audit,
      input.id ? "site.update" : "site.create",
      "Site",
      async (tx) => {
        const project = await tx.project.findUniqueOrThrow({
          where: { id: input.projectId },
          select: { organizationId: true },
        });
        const existing = input.id
          ? await tx.site.findUniqueOrThrow({
              where: { id: input.id },
              select: { projectId: true },
            })
          : null;
        if (existing && existing.projectId !== input.projectId) {
          throw new Error("SITE_PROJECT_IMMUTABLE");
        }
        const data = {
          organizationId: project.organizationId,
          projectId: input.projectId,
          slug: input.slug,
          name: input.name,
          url: input.url,
          timezone: input.timezone,
          enabled: input.enabled,
        };
        const record = input.id
          ? await tx.site.update({ where: { id: input.id }, data })
          : await tx.site.create({ data });
        return {
          id: record.id,
          organizationId: project.organizationId,
          beforeMarker: { existed: Boolean(existing) },
          afterMarker: {
            slug: record.slug,
            name: record.name,
            enabled: record.enabled,
          },
        };
      },
    );
  }

  saveProviderConnection(input: SaveProviderConnectionInput, audit: AuditContext) {
    return this.auditedMutation(audit, "provider-connection.save", "ProviderConnection", async (tx) => {
      const site = await tx.site.findUniqueOrThrow({ where: { id: input.siteId }, include: { project: { select: { organizationId: true } } } });
      const record = await tx.providerConnection.upsert({
        where: { siteId_provider: { siteId: input.siteId, provider: input.provider } },
        update: {
          organizationId: site.project.organizationId,
          externalId: input.externalId,
          enabled: input.enabled,
          settingsJson: input.settings ?? Prisma.JsonNull,
        },
        create: {
          organizationId: site.project.organizationId,
          siteId: input.siteId,
          provider: input.provider,
          externalId: input.externalId,
          enabled: input.enabled,
          settingsJson: input.settings ?? Prisma.JsonNull,
        },
      });
      return { id: record.id, organizationId: site.project.organizationId, beforeMarker: { connection: "existing-or-new" }, afterMarker: { provider: record.provider, enabled: record.enabled, externalId: record.externalId ?? "" } };
    });
  }

  saveGoal(input: SaveGoalInput, audit: AuditContext) {
    return this.auditedMutation(audit, "goal.save", "GoalDefinition", async (tx) => {
      const project = await tx.project.findUniqueOrThrow({ where: { id: input.projectId }, select: { organizationId: true } });
      const record = await tx.goalDefinition.upsert({
        where: { projectId_externalGoalId: { projectId: input.projectId, externalGoalId: input.externalGoalId } },
        update: {
          organizationId: project.organizationId,
          label: input.label,
          category: input.category,
          direction: input.direction,
          includeInSeoConversion: input.includeInSeoConversion,
        },
        create: { ...input, organizationId: project.organizationId },
      });
      return { id: record.id, organizationId: project.organizationId, beforeMarker: { goal: "existing-or-new" }, afterMarker: { externalGoalId: record.externalGoalId, label: record.label, includeInSeoConversion: record.includeInSeoConversion } };
    });
  }

  replaceTrackedQuerySet(input: ReplaceTrackedQuerySetInput, audit: AuditContext) {
    return this.auditedMutation(
      audit,
      "tracked-query-set.replace",
      "TrackedQuerySet",
      async (tx) => {
        const site = await tx.site.findUniqueOrThrow({
          where: { id: input.siteId },
          include: { project: { select: { organizationId: true } } },
        });
        const existing = await tx.trackedQuerySet.findUnique({
          where: { siteId: input.siteId },
          select: { id: true },
        });
        const set = await tx.trackedQuerySet.upsert({
          where: { siteId: input.siteId },
          update: {
            source: input.source,
            baselineLabel: input.baselineLabel,
            expectedCount: input.queries.length,
            organizationId: site.project.organizationId,
          },
          create: {
            siteId: input.siteId,
            source: input.source,
            baselineLabel: input.baselineLabel,
            expectedCount: input.queries.length,
            organizationId: site.project.organizationId,
          },
        });
        const queries = input.queries.map((query) => ({
          organizationId: site.project.organizationId,
          trackedQuerySetId: set.id,
          query,
          normalizedQuery: query.toLocaleLowerCase("ru").replace(/\s+/g, " ").trim(),
          enabled: true,
        }));
        await tx.trackedQuery.updateMany({
          where: { trackedQuerySetId: set.id, enabled: true },
          data: { enabled: false, organizationId: site.project.organizationId },
        });
        await tx.trackedQuery.createMany({ data: queries, skipDuplicates: true });
        await tx.trackedQuery.updateMany({
          where: {
            trackedQuerySetId: set.id,
            normalizedQuery: { in: queries.map((query) => query.normalizedQuery) },
          },
          data: { enabled: true, organizationId: site.project.organizationId },
        });
        return {
          id: set.id,
          organizationId: site.project.organizationId,
          beforeMarker: { existed: Boolean(existing) },
          afterMarker: {
            source: set.source,
            baselineLabel: set.baselineLabel,
            expectedCount: set.expectedCount,
          },
        };
      },
    );
  }

  saveThresholdProfile(input: SaveThresholdProfileInput, audit: AuditContext) {
    return this.auditedMutation(audit, "threshold-profile.save", "ThresholdProfile", async (tx) => {
      const record = await tx.thresholdProfile.upsert({ where: { slug: input.slug }, update: input, create: input });
      return { id: record.id, organizationId: null, beforeMarker: { profile: "existing-or-new" }, afterMarker: { slug: record.slug, minimumShows: record.minimumShows } };
    });
  }

  saveClusterProfile(input: SaveClusterProfileInput, audit: AuditContext) {
    return this.auditedMutation(audit, "cluster-profile.save", "QueryClusterProfile", async (tx) => {
      const existing = await tx.queryClusterProfile.findUnique({ where: { slug: input.slug }, select: { id: true } });
      const profile = await tx.queryClusterProfile.upsert({ where: { slug: input.slug }, update: { name: input.name }, create: { slug: input.slug, name: input.name } });
      await tx.queryClusterGroup.deleteMany({ where: { profileId: profile.id } });
      if (input.groups.length > 0) {
        await tx.queryClusterGroup.createMany({ data: input.groups.map((group) => ({ profileId: profile.id, slug: group.slug, label: group.label, order: group.order, brandTermsJson: group.brandTerms, termsJson: group.terms })) });
      }
      return { id: profile.id, organizationId: null, beforeMarker: { existed: Boolean(existing) }, afterMarker: { slug: profile.slug, name: profile.name, groups: input.groups.length } };
    });
  }
}
