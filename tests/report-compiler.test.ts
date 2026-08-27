import { describe, expect, it } from "vitest";
import { compileSiteReportSnapshot } from "../collector/orchestration/report-compiler";
import { getClientBySlug } from "../src/modules/client-registry/registry";
import {
  createMetricaSourceFixture,
  createWebmasterSourceFixture,
} from "./helpers/source-dto-fixtures";

function getREDACTED_CLIENT_DATASite() {
  const site = getClientBySlug("REDACTED_CLIENT_DATA")?.sites.find((item) => item.siteSlug === "REDACTED_CLIENT_DATA");
  if (!site) throw new Error("Missing REDACTED_CLIENT_DATA REDACTED_CLIENT_DATA fixture site");
  return site;
}

const thresholds = {
  minimumShows: 30,
  maximumCtrPercent: 5,
  maximumAveragePosition: 10,
};

describe("SiteReportSnapshot compiler", () => {
  it("compiles both source DTOs into one validated snapshot", () => {
    const site = getREDACTED_CLIENT_DATASite();
    const snapshot = compileSiteReportSnapshot({
      clientSlug: "REDACTED_CLIENT_DATA",
      site,
      generatedAt: "2026-08-27T10:10:00.000Z",
      webmasterData: createWebmasterSourceFixture(site),
      metricaData: createMetricaSourceFixture(site),
      queryThresholds: thresholds,
    });

    expect(snapshot.freshness).toBe("fresh");
    expect(snapshot.sources.webmaster.status).toBe("success");
    expect(snapshot.sources.metrica.status).toBe("success");
    expect(snapshot.webmaster?.summary.shows).toBe(100);
    expect(snapshot.metrica?.summary.visits).toBe(100);
    expect(snapshot.combined.funnel).toMatchObject({
      shows: 100,
      clicks: 5,
      visits: 100,
      goalReaches: 5,
    });
    expect(snapshot.combined.methodology.join(" ")).toContain(
      "конкретная заявка не утверждается",
    );
  });

  it("uses last-known-good source section and marks a failed refresh partial", () => {
    const site = getREDACTED_CLIENT_DATASite();
    const previous = compileSiteReportSnapshot({
      clientSlug: "REDACTED_CLIENT_DATA",
      site,
      generatedAt: "2026-08-27T10:10:00.000Z",
      webmasterData: createWebmasterSourceFixture(site),
      metricaData: createMetricaSourceFixture(site),
      queryThresholds: thresholds,
    });
    const partial = compileSiteReportSnapshot({
      clientSlug: "REDACTED_CLIENT_DATA",
      site,
      generatedAt: "2026-08-28T10:10:00.000Z",
      webmasterData: createWebmasterSourceFixture(site),
      metricaData: null,
      metricaFailure: { code: "RATE_LIMITED", status: 420 },
      previous,
      queryThresholds: thresholds,
    });

    expect(partial.freshness).toBe("partial");
    expect(partial.sources.metrica.status).toBe("quota_limited");
    expect(partial.sources.metrica.safeErrorCode).toBe("RATE_LIMITED");
    expect(partial.metrica).toEqual(previous.metrica);
    expect(partial.combined.funnel.visits).toBe(100);
  });
});
