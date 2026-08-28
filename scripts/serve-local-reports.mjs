import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.AMS_SEO_MONITOR_REPORT_PORT ?? 3001);
const reportRoot = path.resolve(
  process.env.AMS_SEO_MONITOR_SHARED_DIR ?? ".local/shared",
  "client-reports",
);
const allowedOrigins = new Set([
  "http://127.0.0.1:3000",
  "http://localhost:3000",
]);
const reportPathPattern =
  /^\/c\/([a-z0-9]+(?:-[a-z0-9]+)*)\/data\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(week|month|quarter|halfYear)\/latest\.json$/;

function setCommonHeaders(response, origin) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.setHeader("Vary", "Origin");
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }
}

function sendJson(response, status, payload, origin) {
  setCommonHeaders(response, origin);
  response.writeHead(status);
  response.end(`${JSON.stringify(payload)}\n`);
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    sendJson(response, 403, { error: "origin_not_allowed" }, origin);
    return;
  }

  if (request.method === "OPTIONS") {
    setCommonHeaders(response, origin);
    response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "method_not_allowed" }, origin);
    return;
  }

  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  const match = reportPathPattern.exec(url.pathname);
  if (!match) {
    sendJson(response, 404, { error: "report_not_found" }, origin);
    return;
  }

  const [, clientSlug, siteSlug, periodKey] = match;
  const reportPath = path.resolve(
    reportRoot,
    clientSlug,
    siteSlug,
    periodKey,
    "latest.json",
  );
  const expectedPrefix = `${reportRoot}${path.sep}`;
  if (!reportPath.startsWith(expectedPrefix)) {
    sendJson(response, 403, { error: "invalid_report_path" }, origin);
    return;
  }

  const reportStat = await stat(reportPath).catch(() => null);
  if (!reportStat?.isFile()) {
    sendJson(response, 404, { error: "report_not_found" }, origin);
    return;
  }

  setCommonHeaders(response, origin);
  response.setHeader("Content-Length", reportStat.size);
  response.writeHead(200);
  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(reportPath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Local report server: http://${host}:${port}`);
  console.log(`Report root: ${reportRoot}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
