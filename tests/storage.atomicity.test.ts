import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { publishSiteSnapshot, readLatestSiteSnapshot } from "../collector/storage/snapshots";
import { getFixtureSnapshot } from "../src/modules/report-data/demo-data";

const tempDirs: string[] = [];

async function createTempRoot() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ams-seo-monitor-"));
  tempDirs.push(dir);
  return dir;
}

function requireFixture() {
  const snapshot = getFixtureSnapshot("REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA");
  if (!snapshot) {
    throw new Error("Expected REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA fixture snapshot");
  }
  return snapshot;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("publishSiteSnapshot", () => {
  it("keeps latest valid snapshot when publish fails after temp write", async () => {
    const rootDir = await createTempRoot();
    const initial = requireFixture();

    await publishSiteSnapshot({ rootDir, snapshot: initial });

    const failing = {
      ...initial,
      generatedAt: "2026-08-28T09:30:00+03:00",
      combined: {
        ...initial.combined,
        alerts: [
          ...initial.combined.alerts,
          {
            id: "alert-2",
            title: "Synthetic failure",
            summary: "Intentional failure point for atomicity coverage.",
            tone: "warning" as const,
          },
        ],
      },
    };

    await expect(
      publishSiteSnapshot({ rootDir, snapshot: failing, failStage: "after-temp-write" }),
    ).rejects.toThrow("Simulated publish failure after temp write");

    const latest = await readLatestSiteSnapshot(rootDir, "REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA");
    expect(latest?.generatedAt).toBe(initial.generatedAt);
  });

  it("preserves last known metrica data on partial publish", async () => {
    const rootDir = await createTempRoot();
    const initial = requireFixture();

    await publishSiteSnapshot({ rootDir, snapshot: initial });

    const partial = {
      ...initial,
      generatedAt: "2026-08-29T09:30:00+03:00",
      freshness: "partial" as const,
      sources: {
        ...initial.sources,
        metrica: {
          ...initial.sources.metrica,
          status: "partial" as const,
          note: "Metrica fixture intentionally withheld for merge test.",
        },
      },
      metrica: null,
    };

    await publishSiteSnapshot({ rootDir, snapshot: partial });

    const latest = await readLatestSiteSnapshot(rootDir, "REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA");
    expect(latest?.generatedAt).toBe(partial.generatedAt);
    expect(latest?.metrica?.summary.visits).toBe(initial.metrica?.summary.visits);
  });
});
