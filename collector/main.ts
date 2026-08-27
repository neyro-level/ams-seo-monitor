import { syncClientSites } from "./orchestration/client-sync";
import { createMetricaClient, readMetricaEnvironment } from "./sources/yandex-metrica/client";
import { MetricaSafeError } from "./sources/yandex-metrica/http";
import { createWebmasterClient, readWebmasterEnvironment } from "./sources/yandex-webmaster/client";
import { WebmasterSafeError } from "./sources/yandex-webmaster/http";

async function main() {
  const command = process.argv[2] ?? "webmaster-preflight";

  if (command === "webmaster-preflight" || command === "webmaster-audit") {
    const config = readWebmasterEnvironment(process.env);
    const client = createWebmasterClient(config);
    const result = command === "webmaster-preflight" ? await client.preflight() : await client.collectSiteData();
    process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
    return;
  }

  if (command === "metrica-preflight" || command === "metrica-audit") {
    const config = readMetricaEnvironment(process.env);
    const client = createMetricaClient(config);
    const result = command === "metrica-preflight" ? await client.preflight() : await client.collectSiteData();
    process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
    return;
  }

  if (command === "client-sync") {
    const clientSlug = process.argv[3];
    const sharedDir = process.env.AMS_SEO_MONITOR_SHARED_DIR?.trim();
    if (!clientSlug) {
      throw new Error("client-sync requires a client slug");
    }
    if (!sharedDir) {
      throw new Error("Required environment variable is missing: AMS_SEO_MONITOR_SHARED_DIR");
    }

    const result = await syncClientSites({
      clientSlug,
      sharedDir,
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
      })}
`,
    );
    process.exitCode = 1;
    return;
  }

  process.stderr.write(`${error instanceof Error ? error.message : String(error)}
`);
  process.exitCode = 1;
});
