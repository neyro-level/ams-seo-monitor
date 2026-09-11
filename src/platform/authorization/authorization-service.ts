import type { PrincipalContext } from "./principal.ts";
import type {
  AuthorizationDecision,
  ProductCode,
  ProductPermission,
  ProductProjectGrant,
  ProductRole,
  ResourceRef,
} from "./access-types.ts";

const ROLE_PERMISSIONS: Record<ProductCode, Record<ProductRole, readonly ProductPermission[]>> = {
  "seo-monitor": {
    VIEWER: ["seo:project:read", "seo:report:read"],
    OPERATOR: ["seo:project:read", "seo:report:read", "seo:project:operate"],
    ANALYST: ["seo:project:read", "seo:report:read", "seo:project:operate"],
  },
  leads: {
    VIEWER: ["leads:project:read"],
    OPERATOR: ["leads:project:read", "leads:project:operate"],
    ANALYST: ["leads:project:read", "leads:project:operate"],
  },
  tools: {
    VIEWER: ["tools:project:read", "research:export"],
    OPERATOR: ["tools:project:read", "research:create", "research:update", "research:estimate", "research:run", "research:export"],
    ANALYST: ["tools:project:read", "research:create", "research:update", "research:estimate", "research:run", "research:export"],
  },
};

export interface AccessGrantRepository {
  listProjectGrants(userId: string, product?: ProductCode): Promise<ProductProjectGrant[]>;
}

function principalUserId(principal: PrincipalContext): string | null {
  if (principal.kind === "api-client" || principal.kind === "job") return null;
  return principal.userId;
}

export class AuthorizationService {
  constructor(private readonly grants: AccessGrantRepository) {}

  async listAccessibleProducts(principal: PrincipalContext): Promise<ProductCode[]> {
    if (principal.kind === "platform-admin") return ["seo-monitor", "leads", "tools"];
    const userId = principalUserId(principal);
    if (!userId) return [];
    const grants = await this.grants.listProjectGrants(userId);
    return [...new Set(grants.map(({ product }) => product))];
  }

  async listAccessibleProjectIds(
    principal: PrincipalContext,
    product: ProductCode,
  ): Promise<string[] | null> {
    if (principal.kind === "platform-admin") return null;
    const userId = principalUserId(principal);
    if (!userId) return [];
    const grants = await this.grants.listProjectGrants(userId, product);
    return [...new Set(grants.map(({ projectId }) => projectId))];
  }

  async authorize(
    principal: PrincipalContext,
    permission: ProductPermission,
    resource: ResourceRef,
  ): Promise<AuthorizationDecision> {
    if (principal.kind === "platform-admin") return { allowed: true, role: "PLATFORM_ADMIN" };
    if (!resource.projectId) return { allowed: false, code: "RESOURCE_SCOPE_REQUIRED" };
    const userId = principalUserId(principal);
    if (!userId) return { allowed: false, code: "ACCESS_DENIED" };
    const grants = await this.grants.listProjectGrants(userId, resource.product);
    const grant = grants.find(({ projectId, organizationId }) =>
      projectId === resource.projectId &&
      (!resource.organizationId || organizationId === resource.organizationId));
    if (!grant || !ROLE_PERMISSIONS[resource.product][grant.role].includes(permission)) {
      return { allowed: false, code: "ACCESS_DENIED" };
    }
    return { allowed: true, role: grant.role };
  }
}
