import { z } from "zod";
import { syncProjectToDatabase } from "../data-ingestion/worker.ts";
import { getWorkerReliabilityService } from "../../infrastructure/worker-service-container.ts";
import type { ClaimedReliabilityEvent } from "./application/ports/reliability-repository.ts";

const projectSyncPayloadSchema = z.object({
  projectSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  trigger: z.enum(["daily", "manual", "preflight", "backfill"]).default("manual"),
});

function outboxError(code: string, retryable: boolean) {
  return Object.assign(new Error(code), { code, retryable });
}

async function handleProjectSync(event: ClaimedReliabilityEvent) {
  const payload = projectSyncPayloadSchema.safeParse(event.payload);
  if (!payload.success) {
    throw outboxError("INVALID_OUTBOX_PAYLOAD", false);
  }

  const result = await syncProjectToDatabase({
    projectSlug: payload.data.projectSlug,
    trigger: payload.data.trigger,
    env: process.env,
  });
  if (result.status === "failed") {
    throw outboxError("PROJECT_SYNC_FAILED", true);
  }
}

async function handleEvent(event: ClaimedReliabilityEvent) {
  if (event.topic === "project.sync.requested") {
    await handleProjectSync(event);
    return;
  }

  throw outboxError("UNKNOWN_OUTBOX_TOPIC", false);
}

export interface DrainOutboxOptions {
  workerId: string;
  maxEvents?: number;
}

export interface DrainOutboxResult {
  claimed: number;
  completed: number;
  failed: number;
}

export async function drainOutbox(options: DrainOutboxOptions): Promise<DrainOutboxResult> {
  const reliability = getWorkerReliabilityService();
  const maxEvents = z.number().int().min(1).max(100).parse(options.maxEvents ?? 25);
  const result: DrainOutboxResult = { claimed: 0, completed: 0, failed: 0 };

  for (let index = 0; index < maxEvents; index += 1) {
    const event = await reliability.claim(options.workerId);
    if (!event) {
      break;
    }
    result.claimed += 1;

    try {
      await handleEvent(event);
      await reliability.complete(event);
      result.completed += 1;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error && typeof error.code === "string"
          ? error.code
          : "OUTBOX_HANDLER_FAILED";
      const retryable = Boolean(
        error && typeof error === "object" && "retryable" in error && error.retryable,
      );
      await reliability.fail(event, code, retryable);
      result.failed += 1;
    }
  }

  return result;
}
