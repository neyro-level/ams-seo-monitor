import { describe, expect, it } from "vitest";
import { buildNavigation } from "../src/modules/access/navigation";

describe("static client navigation isolation", () => {
  it("renders only the current client subtree on a client route", () => {
    const sections = buildNavigation("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/");
    const items = sections.flatMap((section) => section.items);

    expect(sections).toHaveLength(2);
    expect(items.map((item) => item.label)).toEqual(["Общий кабинет", "Проекты", "REDACTED_CLIENT_DATA"]);
    expect(items[2]?.children?.map((item) => item.label)).toEqual([
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
    ]);
    expect(JSON.stringify(sections)).not.toContain("Союз застройщиков");
    expect(JSON.stringify(sections)).not.toContain("\"label\":\"Аналитик\"");
  });

  it("renders every project and the projects route for the analyst", () => {
    const sections = buildNavigation("/analyst/projects/");
    const serialized = JSON.stringify(sections);
    const overviewItems = sections[0]?.items ?? [];

    expect(serialized).toContain("REDACTED_CLIENT_DATA");
    expect(serialized).toContain("Союз застройщиков");
    expect(overviewItems.map((item) => item.label)).toEqual(["Общий кабинет", "Проекты"]);
    expect(overviewItems[1]?.active).toBe(true);
  });
});
