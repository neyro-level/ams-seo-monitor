import { describe, expect, it, vi } from "vitest";
import {
  createTopvisorClient,
  normalizeTopvisorHistory,
  readTopvisorEnvironment,
  TopvisorSafeError,
} from "../collector/sources/topvisor/client.ts";
import { getClientBySlug } from "../src/modules/project-registry/server.ts";

function getTopvisorSite() {
  const site = getClientBySlug("REDACTED_CLIENT_DATA")?.sites.find(
    (item) => item.siteSlug === "REDACTED_CLIENT_DATA",
  );
  if (!site) throw new Error("Missing REDACTED_CLIENT_DATA site");
  return {
    ...site,
    topvisor: {
      enabled: true,
      projectId: REDACTED_CLIENT_DATA,
      regionIndex: 0,
    },
  };
}

describe("Topvisor read-only source", () => {
  it("fails safely when credentials are absent", () => {
    expect(() => readTopvisorEnvironment({})).toThrowError(TopvisorSafeError);
  });

  it.each([
    "http://127.0.0.1/v2/json",
    "https://api.topvisor.com.evil.example/v2/json",
    "https://token@api.topvisor.com/v2/json",
  ])("rejects an untrusted API origin before requests: %s", (baseUrl) => {
    expect(() =>
      readTopvisorEnvironment({
        TOPVISOR_API_BASE_URL: baseUrl,
        TOPVISOR_USER_ID: "user-id",
        TOPVISOR_API_KEY: "api-key",
      }),
    ).toThrow("TOPVISOR_API_BASE_URL is not allowlisted");
  });

  it("normalizes exact positions for every capture date", () => {
    const data = normalizeTopvisorHistory({
      payload: {
        result: {
          rows: [
            {
              name: "купить квартиру в REDACTED_CLIENT_DATAе",
              positionsData: [{ position: 12 }, { position: 5 }],
            },
            {
              name: "квартира REDACTED_CLIENT_DATA",
              positionsData: [{ position: null }, { position: 3 }],
            },
          ],
        },
      },
      dates: ["2026-08-01", "2026-08-22"],
      fetchedAt: "2026-08-23T10:00:00.000Z",
      projectId: REDACTED_CLIENT_DATA,
      regionIndex: 0,
    });

    expect(data.snapshots).toEqual([
      {
        capturedAt: "2026-08-01",
        queries: [
          { query: "купить квартиру в REDACTED_CLIENT_DATAе", position: 12 },
          { query: "квартира REDACTED_CLIENT_DATA", position: null },
        ],
      },
      {
        capturedAt: "2026-08-22",
        queries: [
          { query: "купить квартиру в REDACTED_CLIENT_DATAе", position: 5 },
          { query: "квартира REDACTED_CLIENT_DATA", position: 3 },
        ],
      },
    ]);
  });

  it("uses only Topvisor GET operations", async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(input),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      if (String(input).endsWith("/get/positions_2/summary/chart")) {
        return new Response(
          JSON.stringify({ result: { dates: ["2026-08-01", "2026-08-22"] } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          result: {
            rows: [
              {
                name: "купить квартиру в REDACTED_CLIENT_DATAе",
                positionsData: [{ position: 12 }, { position: 5 }],
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const client = createTopvisorClient(
      {
        baseUrl: "https://api.topvisor.test/v2/json",
        userId: "user-id",
        apiKey: "api-key",
      },
      fetchImpl as typeof fetch,
    );

    const result = await client.collectSiteData(getTopvisorSite(), {
      dateFrom: "2026-08-01",
      dateTo: "2026-08-22",
    });

    expect(result.snapshots).toHaveLength(2);
    expect(requests.map((request) => request.url)).toEqual([
      "https://api.topvisor.test/v2/json/get/positions_2/summary/chart",
      "https://api.topvisor.test/v2/json/get/positions_2/history",
    ]);
    expect(requests.every((request) => request.url.includes("/get/"))).toBe(true);
  });
});
