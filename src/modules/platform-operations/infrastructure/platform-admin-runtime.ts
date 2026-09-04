import { getPrismaClient } from "../../../platform/database/prisma/client.ts";
import type { PrincipalContext } from "../../../platform/authorization/principal.ts";
import { ReliabilityService } from "../application/reliability-service.ts";
import { PrismaReliabilityRepository } from "./prisma-reliability-repository.ts";
import {
  PlatformOperationsAdminError,
  requestProjectSyncInputSchema,
  type OperationListResult,
  type RequestProjectSyncInput,
} from "../domain/platform-admin.ts";
import type { PlatformAdminListQuery } from "../../platform-admin/contracts.ts";

const reliabilityService = new ReliabilityService(new PrismaReliabilityRepository());

function requirePlatformAdmin(principal: PrincipalContext) {
  if (principal.kind !== "platform-admin") {
    throw new PlatformOperationsAdminError("PLATFORM_OPERATIONS_ADMIN_ACCESS_DENIED");
  }
  return {
    actorId: principal.userId,
    correlationId: principal.correlationId,
  };
}

export async function listOperations(
  principal: PrincipalContext,
  query: PlatformAdminListQuery,
): Promise<OperationListResult> {
  requirePlatformAdmin(principal);
  const prisma = getPrismaClient();
  const [syncRuns, outboxEvents] = await prisma.$transaction([
    prisma.syncRun.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        trigger: true,
        projectSlug: true,
        status: true,
        sitesProcessed: true,
        safeError: true,
        updatedAt: true,
      },
    }),
    prisma.outboxEvent.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        topic: true,
        status: true,
        attempts: true,
        lastErrorCode: true,
        updatedAt: true,
      },
    }),
  ]);

  const search = query.search.toLocaleLowerCase("ru");
  const rows = [
    ...syncRuns.map((item) => ({
      id: item.id,
      kind: "sync-run" as const,
      primary: `${item.projectSlug} · ${item.trigger}`,
      secondary: `${item.sitesProcessed} сайтов · ${item.safeError ?? "без ошибки"}`,
      status: item.status,
      updatedAt: item.updatedAt.toISOString(),
    })),
    ...outboxEvents.map((item) => ({
      id: item.id,
      kind: "outbox-event" as const,
      primary: item.topic,
      secondary: `Попыток: ${item.attempts} · ${item.lastErrorCode ?? "без ошибки"}`,
      status: item.status,
      updatedAt: item.updatedAt.toISOString(),
    })),
  ]
    .filter((item) =>
      !search
        || `${item.primary} ${item.secondary} ${item.status}`
          .toLocaleLowerCase("ru")
          .includes(search),
    )
    .sort((left, right) => {
      const field = query.sort === "name" ? "primary" : query.sort === "status" ? "status" : "updatedAt";
      const comparison = left[field].localeCompare(right[field], "ru");
      return query.direction === "asc" ? comparison : -comparison;
    });

  const start = (query.page - 1) * query.pageSize;
  return {
    items: rows.slice(start, start + query.pageSize),
    total: rows.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function requestProjectSync(
  principal: PrincipalContext,
  rawInput: RequestProjectSyncInput,
) {
  const actor = requirePlatformAdmin(principal);
  const input = requestProjectSyncInputSchema.parse(rawInput);
  const project = await getPrismaClient().project.findUnique({
    where: { slug: input.projectSlug },
    select: { id: true, slug: true, organizationId: true },
  });
  if (!project) {
    throw new PlatformOperationsAdminError("PROJECT_SYNC_NOT_FOUND");
  }
  const result = await reliabilityService.enqueue({
    organizationId: project.organizationId,
    organizationScope: project.organizationId,
    idempotencyScope: "platform-admin.project-sync",
    idempotencyKey: input.idempotencyKey,
    topic: "project.sync.requested",
    payload: { projectSlug: project.slug, trigger: "manual" },
    actorType: "USER",
    actorId: actor.actorId,
    action: "project.sync.request",
    entityType: "Project",
    entityId: project.id,
    source: "platform-admin",
    correlationId: actor.correlationId,
  });
  return { outboxEventId: result.outboxEventId, duplicate: result.duplicate };
}
