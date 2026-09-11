import { describe, expect, it } from "vitest";
import {
  getProductDefinition,
  getToolDefinition,
  PRODUCT_CODES,
  PRODUCTS,
  TOOL_CODES,
  TOOLS,
} from "../src/modules/product-catalog/index.ts";

describe("product catalog", () => {
  it("keeps stable product codes and Russian labels", () => {
    expect(PRODUCT_CODES).toEqual(["seo-monitor", "leads", "tools"]);
    expect(PRODUCTS.map(({ label }) => label)).toEqual(["SEO Монитор", "АМС Лиды", "Инструменты"]);
    expect(getProductDefinition("tools").homeHref).toBe("/tools/");
  });

  it("keeps the approved Tools module catalog", () => {
    expect(TOOL_CODES).toEqual(["research", "contracts", "invoices", "presentations", "site-clone"]);
    expect(TOOLS.map(({ label }) => label)).toEqual([
      "Исследования",
      "Договоры",
      "Счета",
      "Презентации",
      "Клон сайтов",
    ]);
    expect(getToolDefinition("research").href).toBe("/tools/research/");
  });

  it("exposes only implemented products and tools as active", () => {
    expect(PRODUCTS.filter(({ availability }) => availability === "ACTIVE").map(({ code }) => code)).toEqual([
      "seo-monitor",
      "tools",
    ]);
    expect(TOOLS.filter(({ availability }) => availability === "ACTIVE").map(({ code }) => code)).toEqual(["research"]);
  });
});
