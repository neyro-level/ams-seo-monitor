import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import type { ProductCode, ProductProjectGrant, ProductRole } from "../../../platform/authorization/access-types.ts";
import type { AccessGrantRepository } from "../../../platform/authorization/authorization-service.ts";
import { getPrismaClient } from "../../../platform/database/prisma/client.ts";

export class PrismaAccessGrantRepository implements AccessGrantRepository {
  constructor(private readonly injectedPrisma?: PrismaClient) {}

  private get prisma(): PrismaClient {
    return this.injectedPrisma ?? getPrismaClient();
  }

  async listProjectGrants(userId: string, product?: ProductCode): Promise<ProductProjectGrant[]> {
    const seoGrants = product && product !== "seo-monitor" ? [] : await this.prisma.seoProjectAccess.findMany({
      where: { membership: { userId } },
      orderBy: [{ organizationId: "asc" }, { projectId: "asc" }],
      select: { organizationId: true, projectId: true, role: true },
    });
    const toolsGrants = product && product !== "tools" ? [] : await this.prisma.$queryRaw<Array<{ organizationId: string; projectId: string; role: ProductRole }>>(Prisma.sql`
      SELECT access."organizationId", access."projectId", access."role"::text AS "role"
      FROM "tools"."ToolsProjectAccess" AS access
      JOIN "tools"."ToolsMembership" AS membership
        ON membership.id = access."membershipId" AND membership."organizationId" = access."organizationId"
      JOIN "public"."User" AS app_user ON app_user.id = membership."userId"
      WHERE membership."userId" = ${userId} AND app_user."disabledAt" IS NULL
      ORDER BY access."organizationId", access."projectId"
    `);
    return [
      ...seoGrants.map((grant) => ({
      product: "seo-monitor" as const,
      organizationId: grant.organizationId,
      projectId: grant.projectId,
      role: grant.role,
      })),
      ...toolsGrants.map((grant) => ({ product: "tools" as const, ...grant })),
    ];
  }
}
