import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger } from "../src/platform/observability/logger.ts";

function captureLogger() {
  let output = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  return {
    logger: createLogger({ scope: "test" }, stream),
    read() {
      return output.trim();
    },
  };
}

describe("pino observability logger", () => {
  it("redacts secrets and cookies from structured logs", () => {
    const { logger, read } = captureLogger();
    logger.info({
      password: "secret-value",
      authorization: "Bearer token",
      headers: { cookie: "sid=1", authorization: "Bearer inner" },
      payload: { apiKey: "top-secret", projectSlug: "REDACTED_CLIENT_DATA" },
    }, "structured-test");

    const payload = JSON.parse(read()) as Record<string, unknown>;
    expect(payload.password).toBe("[REDACTED]");
    expect(payload.authorization).toBe("[REDACTED]");
    expect(payload.headers).toMatchObject({
      cookie: "[REDACTED]",
      authorization: "[REDACTED]",
    });
    expect(payload.payload).toMatchObject({
      apiKey: "[REDACTED]",
      projectSlug: "REDACTED_CLIENT_DATA",
    });
  });
});
