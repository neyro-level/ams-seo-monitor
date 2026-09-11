import { PrismaAccessGrantRepository } from "../identity-access/server.ts";
import { AuthorizationService } from "../../platform/authorization/authorization-service.ts";
import type { IdentityUserPrincipal, PlatformAdminPrincipal } from "../../platform/authorization/principal.ts";
import { getPrismaClient } from "../../platform/database/prisma/client.ts";
import { ConfiguredResearchPricing } from "./infrastructure/configured-research-pricing.ts";
import { PrismaResearchReportRepository } from "./infrastructure/prisma-research-report-repository.ts";
import { PrismaResearchRepository } from "./infrastructure/prisma-research-repository.ts";
import { S3PrivateExportStorage } from "./infrastructure/s3-private-export-storage.ts";
import { ResearchReportService } from "./application/research-report-service.ts";
import { ResearchService } from "./application/research-service.ts";

export function createResearchMcpServices(principal: PlatformAdminPrincipal | IdentityUserPrincipal) {
  const prisma = getPrismaClient();
  const authorization = new AuthorizationService(new PrismaAccessGrantRepository(prisma));
  const storage = S3PrivateExportStorage.fromEnvironment();
  return {
    research: new ResearchService(
      new PrismaResearchRepository(principal.userId, prisma),
      authorization,
      ConfiguredResearchPricing.fromEnvironment(),
    ),
    reports: new ResearchReportService(
      new PrismaResearchReportRepository(principal.userId, prisma),
      authorization,
      storage,
    ),
  };
}
