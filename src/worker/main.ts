import type { CreateSyncRunInput } from "../application/ports/sync-repository";
import { syncProjectToDatabase } from "./sync-project";

const command = process.argv[2] ?? null;
const projectSlug = process.argv[3] ?? null;
const requestedTrigger = process.argv[4] ?? "manual";
const allowedTriggers: CreateSyncRunInput["trigger"][] = [
  "daily",
  "manual",
  "preflight",
  "backfill",
];

async function main() {
  if (command !== "project-sync" || !projectSlug) {
    throw new Error(
      "Usage: node dist-collector/src/worker/main.js project-sync <project-slug> [daily|manual|preflight|backfill]",
    );
  }
  if (!allowedTriggers.includes(requestedTrigger as CreateSyncRunInput["trigger"])) {
    throw new Error(`Unsupported sync trigger: ${requestedTrigger}`);
  }

  const result = await syncProjectToDatabase({
    projectSlug,
    trigger: requestedTrigger as CreateSyncRunInput["trigger"],
    env: process.env,
  });

  process.stdout.write(`${JSON.stringify(result)}
`);

  if (result.status === "failed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      event: "worker_failed",
      message: error instanceof Error ? error.message : String(error),
    })}
`,
  );
  process.exit(1);
});
