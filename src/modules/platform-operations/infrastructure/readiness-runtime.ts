import { OutboxStatus, SyncRunStatus } from "../../../generated/prisma/client.ts";
import { getPrismaClient } from "../../../platform/database/prisma/client.ts";

export interface WorkerHeartbeatHealth {
  status: "healthy" | "stale" | "unknown";
  lastHeartbeatAt: string | null;
}

export interface IntegrationFreshnessHealth {
  status: "fresh" | "stale" | "unknown";
  latestSyncFinishedAt: string | null;
  latestSyncStatus: "success" | "partial" | "failed" | null;
}

export interface QueueHealth {
  status: "healthy" | "degraded";
  pending: number;
  processing: number;
  deadLetter: number;
}

export interface OperationalReadiness {
  queue: QueueHealth;
  worker: WorkerHeartbeatHealth;
  integrationFreshness: IntegrationFreshnessHealth;
}

const WORKER_HEARTBEAT_STALE_MS = 15 * 60 * 1000;
const INTEGRATION_FRESH_MS = 36 * 60 * 60 * 1000;

function toWorkerStatus(lastHeartbeatAt: Date | null, now: Date) {
  if (!lastHeartbeatAt) return "unknown" as const;
  return now.getTime() - lastHeartbeatAt.getTime() <= WORKER_HEARTBEAT_STALE_MS
    ? "healthy"
    : "stale";
}

function toSyncStatus(value: SyncRunStatus): "success" | "partial" | "failed" {
  if (value === SyncRunStatus.SUCCESS) return "success";
  if (value === SyncRunStatus.PARTIAL) return "partial";
  return "failed";
}

export async function getOperationalReadiness(now = new Date()): Promise<OperationalReadiness> {
  const prisma = getPrismaClient();
  const [pending, processing, deadLetter, latestJobRun, latestRetentionRun, latestSyncRun] =
    await Promise.all([
      prisma.outboxEvent.count({ where: { status: OutboxStatus.PENDING } }),
      prisma.outboxEvent.count({ where: { status: OutboxStatus.PROCESSING } }),
      prisma.outboxEvent.count({ where: { status: OutboxStatus.DEAD_LETTER } }),
      prisma.jobRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
      prisma.retentionRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
      prisma.syncRun.findFirst({
        where: { finishedAt: { not: null } },
        orderBy: { finishedAt: "desc" },
        select: { finishedAt: true, status: true },
      }),
    ]);

  const lastHeartbeatDate = [
    latestJobRun?.startedAt ?? null,
    latestRetentionRun?.startedAt ?? null,
    latestSyncRun?.finishedAt ?? null,
  ].reduce<Date | null>((latest, current) => {
    if (!current) return latest;
    if (!latest || current.getTime() > latest.getTime()) return current;
    return latest;
  }, null);

  const latestSyncFinishedAt = latestSyncRun?.finishedAt ?? null;
  const latestSyncStatus = latestSyncRun ? toSyncStatus(latestSyncRun.status) : null;
  const freshnessStatus =
    !latestSyncFinishedAt
      ? "unknown"
      : now.getTime() - latestSyncFinishedAt.getTime() <= INTEGRATION_FRESH_MS
        && latestSyncStatus !== "failed"
        ? "fresh"
        : "stale";

  return {
    queue: {
      status: deadLetter > 0 ? "degraded" : "healthy",
      pending,
      processing,
      deadLetter,
    },
    worker: {
      status: toWorkerStatus(lastHeartbeatDate, now),
      lastHeartbeatAt: lastHeartbeatDate?.toISOString() ?? null,
    },
    integrationFreshness: {
      status: freshnessStatus,
      latestSyncFinishedAt: latestSyncFinishedAt?.toISOString() ?? null,
      latestSyncStatus,
    },
  };
}
