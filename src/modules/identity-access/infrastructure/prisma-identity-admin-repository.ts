import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import type { DatabaseTransaction } from "../../../platform/database/transaction.ts";
import { getPrismaClient } from "../../../platform/database/prisma/client.ts";
import {
  IdentityAdminError,
  toLegacyMembershipRole,
  type CreateMembershipInput,
  type CreateOrganizationInput,
  type IdentityAdminFormOptions,
  type IdentityAdminListQuery,
  type MembershipListItem,
  type MembershipListResult,
  type OrganizationListItem,
  type OrganizationListResult,
  type UpdateMembershipInput,
  type UpdateOrganizationInput,
} from "../domain/admin-identity.ts";
import type {
  IdentityAdminAuditInput,
  IdentityAdminRepository,
} from "../application/ports/identity-admin-repository.ts";

const organizationSelect = {
  id: true,
  slug: true,
  name: true,
  version: true,
  updatedAt: true,
  _count: { select: { members: true, projects: true } },
} satisfies Prisma.OrganizationSelect;

const membershipSelect = {
  id: true,
  organizationId: true,
  version: true,
  tenantRole: true,
  updatedAt: true,
  organization: { select: { name: true } },
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.MemberSelect;

const actionMembershipSelect = {
  id: true,
  organizationId: true,
  userId: true,
  tenantRole: true,
  version: true,
} satisfies Prisma.MemberSelect;

type PrismaStore = PrismaClient | DatabaseTransaction;
type SelectedOrganization = Prisma.OrganizationGetPayload<{
  select: typeof organizationSelect;
}>;
type SelectedMembership = Prisma.MemberGetPayload<{
  select: typeof membershipSelect;
}>;

function organizationWhere(search: string): Prisma.OrganizationWhereInput {
  if (!search) return {};
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ],
  };
}

function membershipWhere(search: string): Prisma.MemberWhereInput {
  if (!search) return {};
  return {
    OR: [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { organization: { name: { contains: search, mode: "insensitive" } } },
    ],
  };
}

function toOrganizationListItem(record: SelectedOrganization): OrganizationListItem {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    version: record.version,
    membershipCount: record._count.members,
    projectCount: record._count.projects,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toMembershipListItem(record: SelectedMembership): MembershipListItem {
  return {
    id: record.id,
    organizationId: record.organizationId,
    organizationName: record.organization.name,
    userId: record.user.id,
    userName: record.user.name,
    userEmail: record.user.email,
    tenantRole: record.tenantRole,
    version: record.version,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function translateWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : "";
      if (target.includes("slug")) {
        throw new IdentityAdminError("ORGANIZATION_SLUG_CONFLICT");
      }
      throw new IdentityAdminError("MEMBERSHIP_ALREADY_EXISTS");
    }
    if (error.code === "P2003") {
      throw new IdentityAdminError("MEMBERSHIP_REFERENCE_INVALID");
    }
  }
  throw error;
}

export class PrismaIdentityAdminRepository implements IdentityAdminRepository {
  constructor(private readonly injectedPrisma?: PrismaStore) {}

  private get prisma(): PrismaStore {
    return this.injectedPrisma ?? getPrismaClient();
  }
  async listOrganizations(
    query: IdentityAdminListQuery,
  ): Promise<OrganizationListResult> {
    const where = organizationWhere(query.search);
    const orderBy: Prisma.OrganizationOrderByWithRelationInput =
      query.sort === "createdAt" || query.sort === "updatedAt"
        ? { [query.sort]: query.direction }
        : { name: query.direction };
    const [total, records] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: organizationSelect,
      }),
    ]);
    return {
      items: records.map(toOrganizationListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listMemberships(
    query: IdentityAdminListQuery,
  ): Promise<MembershipListResult> {
    const normalizedSearch = query.search.trim();
    const where = membershipWhere(normalizedSearch);
    const tenantRole =
      normalizedSearch.toUpperCase() === "ORG_OWNER" ||
      normalizedSearch.toUpperCase() === "ORG_MEMBER" ||
      normalizedSearch.toUpperCase() === "VIEWER"
        ? normalizedSearch.toUpperCase()
        : null;
    const scopedWhere: Prisma.MemberWhereInput = tenantRole
      ? { ...where, tenantRole: tenantRole as MembershipListItem["tenantRole"] }
      : where;
    const orderBy: Prisma.MemberOrderByWithRelationInput =
      query.sort === "status"
        ? { tenantRole: query.direction }
        : query.sort === "name"
          ? { user: { name: query.direction } }
          : query.sort === "createdAt"
            ? { createdAt: query.direction }
            : { updatedAt: query.direction };
    const total = await this.prisma.member.count({ where: scopedWhere });
    const records = (await this.prisma.member.findMany({
      where: scopedWhere,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: membershipSelect,
    })) as SelectedMembership[];
    return {
      items: records.map(toMembershipListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listFormOptions(): Promise<IdentityAdminFormOptions> {
    const [organizations, users] = await Promise.all([
      this.prisma.organization.findMany({
        orderBy: { name: "asc" },
        take: 100,
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { disabledAt: null },
        orderBy: { name: "asc" },
        take: 100,
        select: { id: true, name: true, email: true },
      }),
    ]);

    return {
      organizations,
      users: users.map((user) => ({ id: user.id, label: `${user.name} · ${user.email}` })),
    };
  }

  async createOrganization(input: CreateOrganizationInput) {
    try {
      return await this.prisma.organization.create({
        data: {
          slug: input.slug,
          name: input.name,
        },
        select: { id: true, version: true },
      });
    } catch (error) {
      translateWriteError(error);
    }
  }

  findOrganizationForAction(organizationId: string) {
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, slug: true, name: true, version: true },
    });
  }

  async updateOrganization(input: UpdateOrganizationInput): Promise<boolean> {
    try {
      const result = await this.prisma.organization.updateMany({
        where: {
          id: input.organizationId,
          version: input.version,
        },
        data: {
          slug: input.slug,
          name: input.name,
          version: { increment: 1 },
        },
      });
      return result.count === 1;
    } catch (error) {
      translateWriteError(error);
    }
  }

  async createMembership(input: CreateMembershipInput) {
    try {
      return await this.prisma.member.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          tenantRole: input.tenantRole,
          role: toLegacyMembershipRole(input.tenantRole),
        },
        select: { id: true, version: true },
      });
    } catch (error) {
      translateWriteError(error);
    }
  }

  findMembershipForAction(input: {
    organizationId: string;
    membershipId: string;
  }) {
    return this.prisma.member.findFirst({
      where: {
        id: input.membershipId,
        organizationId: input.organizationId,
      },
      select: actionMembershipSelect,
    });
  }

  async updateMembership(input: UpdateMembershipInput): Promise<boolean> {
    const result = await this.prisma.member.updateMany({
      where: {
        id: input.membershipId,
        organizationId: input.organizationId,
        version: input.version,
      },
      data: {
        tenantRole: input.tenantRole,
        role: toLegacyMembershipRole(input.tenantRole),
        version: { increment: 1 },
      },
    });
    return result.count === 1;
  }

  async removeMembership(input: {
    organizationId: string;
    membershipId: string;
    version: number;
  }): Promise<boolean> {
    const result = await this.prisma.member.deleteMany({
      where: {
        id: input.membershipId,
        organizationId: input.organizationId,
        version: input.version,
      },
    });
    return result.count === 1;
  }

  async appendAudit(input: IdentityAdminAuditInput): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorType: "USER",
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeMarker: input.beforeMarker ?? Prisma.JsonNull,
        afterMarker: input.afterMarker ?? Prisma.JsonNull,
        source: "identity-access",
        correlationId: input.correlationId,
      },
    });
  }
}
