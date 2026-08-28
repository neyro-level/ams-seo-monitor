import { describe, expect, it } from "vitest";
import { buildNavigation } from "../src/modules/access/navigation";

describe("static client navigation isolation", () => {
  it("renders only the current client subtree on a client route", () => {
    const sections = buildNavigation("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/");
    const items = sections.flatMap((section) => section.items);

    expect(sections).toHaveLength(2);
    expect(items.map((item) => item.label)).toEqual(["Все проекты", "Проект REDACTED_CLIENT_DATA"]);
    expect(items[1]?.children?.map((item) => item.label)).toEqual([
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
    ]);
    expect(JSON.stringify(sections)).not.toContain("Союз застройщиков");
    expect(items[0]?.active).toBe(false);
  });

  it("renders all projects directly on the analyst root", () => {
    const sections = buildNavigation("/analyst/");
    const serialized = JSON.stringify(sections);
    const mainItems = sections[0]?.items ?? [];
    const projectItems = sections[1]?.items ?? [];

    expect(sections[0]?.title).toBe("");
    expect(mainItems.map((item) => item.label)).toEqual(["Все проекты"]);
    expect(mainItems[0]?.active).toBe(true);
    expect(projectItems.map((item) => item.label)).toEqual([
      "Проект REDACTED_CLIENT_DATA",
      "Проект Союз застройщиков",
    ]);
    expect(serialized).not.toContain("Общий кабинет");
  });
});
