import type { PrismaClient } from "../../../generated/prisma/client.ts";
import type { ProductCode, ProductProjectGrant } from "../../../platform/authorization/access-types.ts";
import type { AccessGrantRepository } from "../../../platform/authorization/authorization-service.ts";
import { getPrismaClient } from "../../../platform/database/prisma/client.ts";

export class PrismaAccessGrantRepository implements AccessGrantRepository {
  constructor(private readonly injectedPrisma?: PrismaClient) {}

  private get prisma(): PrismaClient {
    return this.injectedPrisma ?? getPrismaClient();
  }

  async listProjectGrants(userId: string, product?: ProductCode): Promise<ProductProjectGrant[]> {
    if (product && product !== "seo-monitor") return [];
    const grants = await this.prisma.seoProjectAccess.findMany({
      where: { membership: { userId } },
      orderBy: [{ organizationId: "asc" }, { projectId: "asc" }],
      select: { organizationId: true, projectId: true, role: true },
    });
    return grants.map((grant) => ({
      product: "seo-monitor" as const,
      organizationId: grant.organizationId,
      projectId: grant.projectId,
      role: grant.role,
    }));
  }
}
