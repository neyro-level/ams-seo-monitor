import { describe, expect, it } from "vitest";
import { PrismaAdminRepository } from "../src/modules/admin-cms/server";

describe("Admin CMS runtime boundary", () => {
  it("constructs the server adapter without requiring build-time database configuration", () => {
    expect(() => new PrismaAdminRepository()).not.toThrow();
  });
});
