import { describe, expect, it } from "vitest";
import { getApprovedRoutes, getRegistryBundle } from "../src/modules/client-registry/registry";

describe("registry bundle", () => {
  it("loads clients, clusters and thresholds", () => {
    const bundle = getRegistryBundle();

    expect(bundle.clients).toHaveLength(2);
    expect(bundle.clusters.map((cluster) => cluster.profileSlug)).toContain("real-estate");
    expect(bundle.thresholds.queryOpportunity.minimumShows).toBe(30);
  });

  it("keeps disabled planned sites in approved routes", () => {
    const routes = getApprovedRoutes();

    expect(routes).toContain("/c/REDACTED_CLIENT_DATA/volchevsk/");
    expect(routes).toContain("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/");
    expect(routes).toContain("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/");
  });
});
