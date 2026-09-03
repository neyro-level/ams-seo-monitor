import { describe, expect, it } from "vitest";
import { GET as getLiveHealth } from "../src/app/api/health/live/route.ts";
import { GET as getReadyHealth } from "../src/app/api/health/ready/route.ts";
import { liveHealthSchema, readyHealthSchema } from "../src/platform/http/health.ts";

describe("release-aware health routes", () => {
  it("returns a safe liveness DTO with matching correlation header", async () => {
    const response = getLiveHealth();
    const payload = liveHealthSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe(payload.correlationId);
    expect(payload.releaseSha).toBeNull();
  });

  it("proves PostgreSQL and auth readiness", async () => {
    const response = await getReadyHealth();
    const payload = readyHealthSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe(payload.correlationId);
    expect(payload.dependencies).toMatchObject({
      postgresql: "ready",
      auth: "configured",
      outbox: {
        pending: expect.any(Number),
        processing: expect.any(Number),
        deadLetter: expect.any(Number),
      },
    });
  });
});
