import { createWebmasterClient, readWebmasterEnvironment } from "./sources/yandex-webmaster/client";
import { WebmasterSafeError } from "./sources/yandex-webmaster/http";

async function main() {
  const command = process.argv[2] ?? "webmaster-preflight";

  if (command !== "webmaster-preflight" && command !== "webmaster-audit") {
    throw new Error(`Unknown collector command: ${command}`);
  }

  const config = readWebmasterEnvironment(process.env);
  const client = createWebmasterClient(config);

  const result = command === "webmaster-preflight"
    ? await client.preflight()
    : await client.collectSiteData();

  process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
}

main().catch((error) => {
  if (error instanceof WebmasterSafeError) {
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
