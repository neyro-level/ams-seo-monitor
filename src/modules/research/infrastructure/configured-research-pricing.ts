import type { ResearchPricingPolicy } from "../application/ports/research-provider.ts";

export class ConfiguredResearchPricing implements ResearchPricingPolicy {
  private constructor(private readonly queryCostKopecks: number) {}

  static fromEnvironment(env: Record<string, string | undefined> = process.env) {
    const value = Number(env.RESEARCH_QUERY_ESTIMATE_KOPECKS);
    if (!Number.isSafeInteger(value) || value < 0 || value > 100_000) {
      throw new Error("RESEARCH_PRICING_CONFIGURATION_INVALID");
    }
    return new ConfiguredResearchPricing(value);
  }

  estimateRunCostKopecks(queryCount: number) {
    return this.queryCostKopecks * queryCount;
  }
}
