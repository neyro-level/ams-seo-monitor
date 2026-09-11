import type { JobWithMetadata, PgBoss } from "pg-boss";
import { getPgBoss, stopPgBoss } from "../platform-operations/queue.ts";
import { researchRunJobSchema, RESEARCH_RUN_QUEUE, type ResearchRunJob } from "./domain/research-queue.ts";
import { ResearchExecutionService } from "./application/research-execution-service.ts";
import { PrismaResearchExecutionRepository } from "./infrastructure/prisma-research-execution-repository.ts";
import { XmlRiverClient } from "./infrastructure/xmlriver-client.ts";

type QueueClient = Pick<PgBoss, "fetch" | "complete">;

export async function runNextResearchJobWithDependencies(queue: QueueClient, execution: ResearchExecutionService) {
  const jobs = await queue.fetch<ResearchRunJob>(RESEARCH_RUN_QUEUE, { batchSize: 1, includeMetadata: true });
  const job = jobs[0] as JobWithMetadata<ResearchRunJob> | undefined;
  if (!job) return { handled: 0, status: "idle" as const };
  const parsed = researchRunJobSchema.safeParse(job.data);
  if (!parsed.success) {
    await queue.complete(RESEARCH_RUN_QUEUE, job.id, { status: "ignored", code: "INVALID_RESEARCH_JOB" });
    return { handled: 1, status: "ignored" as const };
  }
  const result = await execution.execute(parsed.data.runId);
  await queue.complete(RESEARCH_RUN_QUEUE, job.id, result);
  return { handled: 1, ...result };
}

export async function runNextResearchJob(env: Record<string, string | undefined> = process.env) {
  const user = env.XMLRIVER_USER?.trim(); const key = env.XMLRIVER_KEY?.trim();
  if (!user || !key) throw new Error("XMLRIVER_CONFIGURATION_MISSING");
  const boss = await getPgBoss();
  const repository = new PrismaResearchExecutionRepository();
  try {
    await repository.failStaleRuns(new Date(Date.now() - 20 * 60 * 1000));
    return await runNextResearchJobWithDependencies(
      boss,
      new ResearchExecutionService(repository, new XmlRiverClient({ user, key })),
    );
  } finally {
    await stopPgBoss();
  }
}
