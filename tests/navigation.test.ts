import { describe, expect, it } from "vitest";
import { buildNavigation } from "../src/modules/access/navigation";

describe("static client navigation isolation", () => {
  it("renders only the current client subtree on a client route", () => {
    const sections = buildNavigation("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/");
    const items = sections.flatMap((section) => section.items);

    expect(sections).toHaveLength(1);
    expect(items.map((item) => item.label)).toEqual(["REDACTED_CLIENT_DATA"]);
    expect(items[0]?.children?.map((item) => item.label)).toEqual([
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
    ]);
    expect(JSON.stringify(sections)).not.toContain("Союз застройщиков REDACTED_CLIENT_DATA");
    expect(JSON.stringify(sections)).not.toContain("Аналитик");
  });

  it("renders every client for the analyst route", () => {
    const sections = buildNavigation("/analyst/");
    const serialized = JSON.stringify(sections);

    expect(serialized).toContain("REDACTED_CLIENT_DATA");
    expect(serialized).toContain("Союз застройщиков REDACTED_CLIENT_DATA");
    expect(serialized).toContain("Аналитик");
  });
});
