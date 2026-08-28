import { describe, expect, it } from "vitest";
import {
  getApprovedRoutes,
  getGoalProfileForClient,
  getRegistryBundle,
} from "../src/modules/client-registry/registry";

describe("registry bundle", () => {
  it("loads clients, clusters and thresholds", () => {
    const bundle = getRegistryBundle();

    expect(bundle.clients).toHaveLength(2);
    expect(bundle.clusters.map((cluster) => cluster.profileSlug)).toContain("real-estate");
    expect(bundle.thresholds.queryOpportunity.minimumShows).toBe(30);
  });

  it("keeps connected and planned sites in approved routes", () => {
    const routes = getApprovedRoutes();

    expect(routes).toContain("/analyst/");

    expect(routes).toContain("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/");
    expect(routes).toContain("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/");
    expect(routes).toContain("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/");
  });

  it("wires all three REDACTED_CLIENT_DATA cities to exact Webmaster and Metrica sources", () => {
    const REDACTED_CLIENT_DATA = getRegistryBundle().clients.find((client) => client.clientSlug === "REDACTED_CLIENT_DATA");

    expect(
      REDACTED_CLIENT_DATA?.sites.map((site) => ({
        slug: site.siteSlug,
        enabled: site.enabled,
        webmaster: site.webmaster.enabled,
        metrica: site.metrica.enabled,
        counterId: site.metrica.counterId,
      })),
    ).toEqual([
      {
        slug: "REDACTED_CLIENT_DATA",
        enabled: true,
        webmaster: true,
        metrica: true,
        counterId: "REDACTED_CLIENT_DATA",
      },
      {
        slug: "REDACTED_CLIENT_DATA",
        enabled: true,
        webmaster: true,
        metrica: true,
        counterId: "REDACTED_CLIENT_DATA",
      },
      {
        slug: "REDACTED_CLIENT_DATA",
        enabled: true,
        webmaster: true,
        metrica: true,
        counterId: "REDACTED_CLIENT_DATA",
      },
    ]);
  });

  it("keeps a separate conversion allowlist for every REDACTED_CLIENT_DATA site", () => {
    const profile = getGoalProfileForClient("REDACTED_CLIENT_DATA");
    const siteSlugs = new Set(profile?.goals.flatMap((goal) => goal.siteSlugs) ?? []);

    expect(siteSlugs).toEqual(new Set(["REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA", "REDACTED_CLIENT_DATA"]));
    expect(profile?.goals.filter((goal) => goal.siteSlugs.includes("REDACTED_CLIENT_DATA"))).toHaveLength(4);
    expect(profile?.goals.filter((goal) => goal.siteSlugs.includes("REDACTED_CLIENT_DATA"))).toHaveLength(4);
  });
});
