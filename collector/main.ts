import { syncProjectToDatabase } from "../src/modules/data-ingestion/worker";
import {
  createMetricaClient,
  readMetricaEnvironment,
} from "./sources/yandex-metrica/client";
import { MetricaSafeError } from "./sources/yandex-metrica/http";
import {
  createWebmasterClient,
  readWebmasterEnvironment,
} from "./sources/yandex-webmaster/client";
import { WebmasterSafeError } from "./sources/yandex-webmaster/http";

async function main() {
  const command = process.argv[2] ?? "webmaster-preflight";

  if (command === "webmaster-preflight" || command === "webmaster-audit") {
    const config = readWebmasterEnvironment(process.env);
    const client = createWebmasterClient(config);
    const result =
      command === "webmaster-preflight"
        ? await client.preflight()
        : await client.collectSiteData();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "metrica-preflight" || command === "metrica-audit") {
    const config = readMetricaEnvironment(process.env);
    const client = createMetricaClient(config);
    const result =
      command === "metrica-preflight"
        ? await client.preflight()
        : await client.collectSiteData();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "client-sync") {
    const projectSlug = process.argv[3];
    if (!projectSlug) {
      throw new Error("client-sync requires a project slug");
    }

    const result = await syncProjectToDatabase({
      projectSlug,
      env: process.env,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown collector command: ${command}`);
}

main().catch((error) => {
  if (error instanceof WebmasterSafeError || error instanceof MetricaSafeError) {
    process.stderr.write(
      `${JSON.stringify({
        safeErrorCode: error.code,
        endpoint: error.endpoint,
        status: error.status,
        message: error.message,
      })}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
