import luganskQueries from "../config/tracked-queries/bastion-lugansk.json";
import { describe, expect, it } from "vitest";
import { trackedQuerySetSchema } from "../src/shared/schemas/tracked-query";

describe("tracked SEO query core", () => {
  it("keeps the complete owner-provided REDACTED_CLIENT_DATA core", () => {
    const parsed = trackedQuerySetSchema.parse(luganskQueries);

    expect(parsed.expectedCount).toBe(75);
    expect(parsed.queries).toHaveLength(75);
  });

  it("preserves the supplied position baseline without inventing a year", () => {
    const parsed = trackedQuerySetSchema.parse(luganskQueries);
    const query = parsed.queries.find(
      (item) => item.query === "купить квартиру в Луганске",
    );

    expect(parsed.baselineLabel).toBe("02.06");
    expect(query?.position).toEqual({ current: 4, baseline: 9, delta: 5 });
  });

  it("keeps core queries without a measured position as nullable evidence", () => {
    const parsed = trackedQuerySetSchema.parse(luganskQueries);
    const query = parsed.queries.find((item) => item.query === "этапы строительства дома");

    expect(query).toMatchObject({
      position: { current: null, baseline: null, delta: 0 },
    });
  });
});
