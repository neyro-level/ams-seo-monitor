import { syncProjectToDatabase } from "./sync-project";

const command = process.argv[2] ?? null;
const projectSlug = process.argv[3] ?? null;

async function main() {
  if (command !== "project-sync" || !projectSlug) {
    throw new Error("Usage: node dist-collector/src/worker/main.js project-sync <project-slug>");
  }

  const result = await syncProjectToDatabase({
    projectSlug,
    env: process.env,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
