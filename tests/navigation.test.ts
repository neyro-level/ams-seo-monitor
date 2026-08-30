import { describe, expect, it } from "vitest";
import { buildNavigation } from "../src/modules/access/navigation";

const navigationTestEnabled = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME,
);
const navigationTestDescription = navigationTestEnabled ? describe : describe.skip;

const analystUser = {
  userId: "analyst-1",
  email: "analyst@test.local",
  name: "Analyst",
  systemRole: "SEO_ANALYST" as const,
  activeOrganizationId: null,
};

const clientViewerUser = {
  userId: "viewer-1",
  email: "viewer@test.local",
  name: "Viewer",
  systemRole: "CLIENT_VIEWER" as const,
  activeOrganizationId: null,
};

navigationTestDescription("database-backed navigation isolation", () => {
  it("renders only the current client subtree on a client route", async () => {
    const sections = await buildNavigation("/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/", clientViewerUser);
    const items = sections.flatMap((section) => section.items);

    expect(sections).toHaveLength(2);
    expect(items.map((item) => item.label)).toEqual(["Мои проекты", "Проект REDACTED_CLIENT_DATA"]);
    expect(items[1]?.children?.map((item) => item.label)).toEqual([
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
    ]);
    expect(JSON.stringify(sections)).not.toContain("Союз застройщиков");
    expect(items[0]?.active).toBe(false);
  });

  it("renders all projects directly on the analyst root", async () => {
    const sections = await buildNavigation("/analyst/", analystUser);
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
