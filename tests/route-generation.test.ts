import { describe, expect, it } from "vitest";
import { getClientStaticParams, getSiteStaticParams } from "../src/modules/client-registry/registry";

describe("static params", () => {
  it("generates client routes from registry", () => {
    expect(getClientStaticParams()).toEqual([
      { clientSlug: "REDACTED_CLIENT_DATA" },
      { clientSlug: "REDACTED_CLIENT_DATA" },
    ]);
  });

  it("generates site routes for connected and planned sites", () => {
    expect(getSiteStaticParams()).toContainEqual({
      clientSlug: "REDACTED_CLIENT_DATA",
      siteSlug: "REDACTED_CLIENT_DATA",
    });
    expect(getSiteStaticParams()).toContainEqual({
      clientSlug: "REDACTED_CLIENT_DATA",
      siteSlug: "REDACTED_CLIENT_DATA",
    });
    expect(getSiteStaticParams()).toContainEqual({
      clientSlug: "REDACTED_CLIENT_DATA",
      siteSlug: "REDACTED_CLIENT_DATA",
    });
  });
});
