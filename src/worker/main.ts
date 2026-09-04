import type { CreateSyncRunInput } from "../modules/data-ingestion/index.ts";
import {
  drainOutbox,
  runReliabilityRetention,
} from "../modules/platform-operations/worker.ts";
import { syncProjectToDatabase } from "../modules/data-ingestion/worker.ts";

const command = process.argv[2] ?? null;
const argument = process.argv[3] ?? null;
const requestedTrigger = process.argv[4] ?? "manual";
const allowedTriggers: CreateSyncRunInput["trigger"][] = [
  "daily",
  "manual",
  "preflight",
  "backfill",
];

async function main() {
  if (command === "outbox-drain") {
    const result = await drainOutbox({ workerId: argument ?? "seo-monitor-worker" });
    process.stdout.write(`${JSON.stringify({ event: "outbox_drain_finished", ...result })}\n`);
    if (result.failed > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "outbox-retention") {
    const result = await runReliabilityRetention();
    process.stdout.write(`${JSON.stringify({ event: "outbox_retention_finished", ...result })}\n`);
    return;
  }

  if (command !== "project-sync" || !argument) {
    throw new Error(
      "Usage: worker project-sync <project-slug> [trigger] | outbox-drain [worker-id] | outbox-retention",
    );
  }
  if (!allowedTriggers.includes(requestedTrigger as CreateSyncRunInput["trigger"])) {
    throw new Error(`Unsupported sync trigger: ${requestedTrigger}`);
  }

  const result = await syncProjectToDatabase({
    projectSlug: argument,
    trigger: requestedTrigger as CreateSyncRunInput["trigger"],
    env: process.env,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);

  if (result.status === "failed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      event: "worker_failed",
      message: error instanceof Error ? error.message : String(error),
    })}\n`,
  );
  process.exit(1);
});
