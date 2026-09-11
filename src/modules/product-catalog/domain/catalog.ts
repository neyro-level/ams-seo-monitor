import { PRODUCT_CODES, type ProductCode } from "../../../platform/authorization/access-types.ts";

export { PRODUCT_CODES };
export type { ProductCode };

export const TOOL_CODES = [
  "research",
  "contracts",
  "invoices",
  "presentations",
  "site-clone",
] as const;
export type ToolCode = (typeof TOOL_CODES)[number];

export type ProductAvailability = "ACTIVE" | "PLANNED";

export type ProductDefinition = {
  code: ProductCode;
  label: string;
  homeHref: string;
  availability: ProductAvailability;
  audience: "CLIENT" | "INTERNAL";
};

export type ToolDefinition = {
  code: ToolCode;
  label: string;
  href: string;
  availability: ProductAvailability;
};

export const PRODUCTS: readonly ProductDefinition[] = [
  {
    code: "seo-monitor",
    label: "SEO Монитор",
    homeHref: "/dashboard/",
    availability: "ACTIVE",
    audience: "CLIENT",
  },
  {
    code: "leads",
    label: "АМС Лиды",
    homeHref: "/leads/",
    availability: "PLANNED",
    audience: "CLIENT",
  },
  {
    code: "tools",
    label: "Инструменты",
    homeHref: "/tools/",
    availability: "ACTIVE",
    audience: "INTERNAL",
  },
] as const;

export const TOOLS: readonly ToolDefinition[] = [
  { code: "research", label: "Исследования", href: "/tools/research/", availability: "ACTIVE" },
  { code: "contracts", label: "Договоры", href: "/tools/contracts/", availability: "PLANNED" },
  { code: "invoices", label: "Счета", href: "/tools/invoices/", availability: "PLANNED" },
  { code: "presentations", label: "Презентации", href: "/tools/presentations/", availability: "PLANNED" },
  { code: "site-clone", label: "Клон сайтов", href: "/tools/site-clone/", availability: "PLANNED" },
] as const;

export function getProductDefinition(code: ProductCode): ProductDefinition {
  const product = PRODUCTS.find((candidate) => candidate.code === code);
  if (!product) throw new Error(`Unknown product: ${code}`);
  return product;
}

export function getToolDefinition(code: ToolCode): ToolDefinition {
  const tool = TOOLS.find((candidate) => candidate.code === code);
  if (!tool) throw new Error(`Unknown tool: ${code}`);
  return tool;
}
