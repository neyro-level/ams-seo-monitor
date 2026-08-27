import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createWebmasterClient } from "../collector/sources/yandex-webmaster/client";

function fixturePath(name: string) {
  return path.join(process.cwd(), "tests", "fixtures", "yandex-webmaster", name);
}

async function loadFixture(name: string) {
  return JSON.parse(await readFile(fixturePath(name), "utf8"));
}

function createJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

describe("webmaster normalized dto", () => {
  it("collects summary, diagnostics, sitemaps and utf-8 queries into normalized DTO", async () => {
    const responses = [
      createJsonResponse(await loadFixture("user.json")),
      createJsonResponse(await loadFixture("hosts.json")),
      createJsonResponse(await loadFixture("summary.json")),
      createJsonResponse(await loadFixture("diagnostics.json")),
      createJsonResponse(await loadFixture("sitemaps.json")),
      createJsonResponse(await loadFixture("queries-total-shows-all.json")),
      createJsonResponse(await loadFixture("queries-total-shows-desktop.json")),
      createJsonResponse(await loadFixture("queries-total-shows-mobile.json")),
      createJsonResponse(await loadFixture("queries-total-clicks-all.json")),
      createJsonResponse(await loadFixture("queries-total-clicks-desktop.json")),
      createJsonResponse(await loadFixture("queries-total-clicks-mobile.json")),
    ];

    const client = createWebmasterClient(
      {
        token: "token",
        baseUrl: "https://api.webmaster.yandex.net/v4",
        targetSiteUrl: "https://REDACTED_CLIENT_DATA",
        tokenStatus: "ACTIVE",
      },
      {
        fetchImpl: async () => responses.shift() ?? createJsonResponse({}),
        now: () => "2026-08-27T10:00:00.000Z",
      },
    );

    const dto = await client.collectSiteData({ queryLimit: 2 });

    expect(dto.access.hostId).toBe("https:REDACTED_CLIENT_DATA:443");
    expect(dto.summary.sqi).toBe(230);
    expect(dto.summary.searchablePages).toBe(2123);
    expect(dto.diagnostics[0]?.code).toBe("NO_SITEMAPS");
    expect(dto.sitemaps[0]?.urlsTotal).toBe(1099);
    expect(dto.queryCollections).toHaveLength(6);
    expect(dto.queryCollections[0]?.queries[0]?.queryText).toBe("квартиры REDACTED_CLIENT_DATA новостройки");
    expect(dto.queryCollections[0]?.queries[0]?.ctrPercent).toBe(10.95);
  });
});
