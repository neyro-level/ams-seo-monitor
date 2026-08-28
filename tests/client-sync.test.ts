import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncClientSites } from "../collector/orchestration/client-sync";
import { readLatestSiteSnapshot } from "../collector/storage/snapshots";
import { MetricaSafeError } from "../collector/sources/yandex-metrica/http";
import {
  createMetricaSourceFixture,
  createWebmasterSourceFixture,
} from "./helpers/source-dto-fixtures";

const tempDirs: string[] = [];

async function createTempRoot() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ams-seo-monitor-client-sync-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("REDACTED_CLIENT_DATA multi-site sync", () => {
  it("publishes a live snapshot for all three enabled cities", async () => {
    const sharedDir = await createTempRoot();
    const metricaPeriods: Array<{
      date1?: string;
      date2?: string;
      includeDetails?: boolean;
    }> = [];
    const result = await syncClientSites({
      clientSlug: "REDACTED_CLIENT_DATA",
      sharedDir,
      collectors: {
        webmaster: async (site) => createWebmasterSourceFixture(site),
        metrica: async (site, period) => {
          metricaPeriods.push(period);
          return createMetricaSourceFixture(site);
        },
      },
      now: () => "2026-08-27T10:10:00.000Z",
    });

    expect(result.status).toBe("success");
    expect(result.sites.map((site) => site.siteSlug)).toEqual([
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
    ]);
    expect(metricaPeriods).toHaveLength(24);
    expect(metricaPeriods.slice(0, 2)).toEqual([
      {
        date1: "2026-08-10",
        date2: "2026-08-23",
        landingLimit: 10,
        includeDetails: true,
      },
      {
        date1: "2026-07-27",
        date2: "2026-08-09",
        landingLimit: 0,
        includeDetails: false,
      },
    ]);
    expect(metricaPeriods.filter((_, index) => index % 2 === 0).every((item) => item.includeDetails)).toBe(
      true,
    );

    for (const siteSlug of ["REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA"]) {
      const snapshot = await readLatestSiteSnapshot(sharedDir, "REDACTED_CLIENT_DATA", siteSlug, "twoWeeks");
      expect(snapshot?.freshness).toBe("fresh");
      expect(snapshot?.webmaster).not.toBeNull();
      expect(snapshot?.metrica).not.toBeNull();
      const report = JSON.parse(
        await readFile(
          path.join(
            sharedDir,
            "client-reports",
            "REDACTED_CLIENT_DATA",
            siteSlug,
            "twoWeeks",
            "latest.json",
          ),
          "utf8",
        ),
      ) as { siteSlug: string };
      expect(report.siteSlug).toBe(siteSlug);
      const sourceBundle = JSON.parse(
        await readFile(
          path.join(
            sharedDir,
            "snapshots",
            "REDACTED_CLIENT_DATA",
            siteSlug,
            "twoWeeks",
            "latest-sources.json",
          ),
          "utf8",
        ),
      ) as { periodKey: string };
      expect(sourceBundle.periodKey).toBe("twoWeeks");
    }
  });

  it("preserves REDACTED_CLIENT_DATA Metrica LKG when its refresh is quota-limited", async () => {
    const sharedDir = await createTempRoot();
    await syncClientSites({
      clientSlug: "REDACTED_CLIENT_DATA",
      sharedDir,
      collectors: {
        webmaster: async (site) => createWebmasterSourceFixture(site),
        metrica: async (site) => createMetricaSourceFixture(site),
      },
      now: () => "2026-08-27T10:10:00.000Z",
    });

    const second = await syncClientSites({
      clientSlug: "REDACTED_CLIENT_DATA",
      sharedDir,
      collectors: {
        webmaster: async (site) => createWebmasterSourceFixture(site),
        metrica: async (site) => {
          if (site.siteSlug === "REDACTED_CLIENT_DATA") {
            throw new MetricaSafeError({
              code: "RATE_LIMITED",
              endpoint: "/stat/v1/data",
              status: 420,
              message: "Quota limited",
            });
          }
          return createMetricaSourceFixture(site);
        },
      },
      now: () => "2026-08-28T10:10:00.000Z",
    });

    expect(second.status).toBe("partial");
    const REDACTED_CLIENT_DATA = await readLatestSiteSnapshot(
      sharedDir,
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "twoWeeks",
    );
    expect(REDACTED_CLIENT_DATA?.freshness).toBe("partial");
    expect(REDACTED_CLIENT_DATA?.sources.metrica.status).toBe("quota_limited");
    expect(REDACTED_CLIENT_DATA?.metrica?.summary.visits).toBe(100);
  });
});
