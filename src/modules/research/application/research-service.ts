import type { AuthorizationService } from "../../../platform/authorization/authorization-service.ts";
import type { PrincipalContext } from "../../../platform/authorization/principal.ts";
import {
  confirmResearchRunInputSchema,
  createResearchInputSchema,
  estimateResearchRunInputSchema,
  ResearchError,
  researchRefSchema,
  updateResearchInputSchema,
  type ResearchRef,
} from "../domain/research.ts";
import type { ResearchRepository } from "./ports/research-repository.ts";
import type { ResearchPricingPolicy } from "./ports/research-provider.ts";

const DAILY_LIMIT_KOPECKS = 50_000 as const;
const MONTHLY_LIMIT_KOPECKS = 300_000 as const;

function principalUserId(principal: PrincipalContext): string | null {
  return principal.kind === "platform-admin" || principal.kind === "platform-analyst" || principal.kind === "tenant-user"
    ? principal.userId
    : null;
}

export class ResearchService {
  constructor(
    private readonly repository: ResearchRepository,
    private readonly authorization: AuthorizationService,
    private readonly pricing: ResearchPricingPolicy,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async requireAccess(principal: PrincipalContext, permission: "tools:project:read" | "research:create" | "research:update" | "research:estimate" | "research:run", ref: Omit<ResearchRef, "researchId">) {
    const decision = await this.authorization.authorize(principal, permission, { product: "tools", ...ref });
    if (!decision.allowed) throw new ResearchError("RESEARCH_NOT_FOUND_OR_FORBIDDEN");
  }

  async list(principal: PrincipalContext, organizationId: string, projectId: string) {
    await this.requireAccess(principal, "tools:project:read", { organizationId, projectId });
    return this.repository.listByProject(organizationId, projectId);
  }

  async get(principal: PrincipalContext, rawRef: unknown) {
    const ref = researchRefSchema.parse(rawRef);
    await this.requireAccess(principal, "tools:project:read", ref);
    const research = await this.repository.findById(ref);
    if (!research) throw new ResearchError("RESEARCH_NOT_FOUND_OR_FORBIDDEN");
    return research;
  }

  async create(principal: PrincipalContext, rawInput: unknown) {
    const input = createResearchInputSchema.parse(rawInput);
    await this.requireAccess(principal, "research:create", input);
    const userId = principalUserId(principal);
    if (!userId) throw new ResearchError("RESEARCH_NOT_FOUND_OR_FORBIDDEN");
    return this.repository.create({ ...input, createdByUserId: userId, correlationId: principal.correlationId });
  }

  async update(principal: PrincipalContext, rawInput: unknown) {
    const input = updateResearchInputSchema.parse(rawInput);
    await this.requireAccess(principal, "research:update", input);
    const current = await this.repository.findById(input);
    if (!current) throw new ResearchError("RESEARCH_NOT_FOUND_OR_FORBIDDEN");
    if (current.version !== input.version) throw new ResearchError("RESEARCH_STALE");
    if (!(["DRAFT", "READY", "FAILED"] as const).includes(current.status as "DRAFT" | "READY" | "FAILED")) {
      throw new ResearchError("RESEARCH_NOT_EDITABLE");
    }
    const actorId = principalUserId(principal);
    if (!actorId) throw new ResearchError("RESEARCH_NOT_FOUND_OR_FORBIDDEN");
    const updated = await this.repository.update({ ...input, actorId, correlationId: principal.correlationId });
    if (!updated) throw new ResearchError("RESEARCH_STALE");
    return updated;
  }

  async archive(principal: PrincipalContext, rawRef: unknown, version: number) {
    const ref = researchRefSchema.parse(rawRef);
    await this.requireAccess(principal, "research:update", ref);
    const actorId = principalUserId(principal);
    if (!actorId) throw new ResearchError("RESEARCH_NOT_FOUND_OR_FORBIDDEN");
    if (!await this.repository.archive({ ...ref, version, actorId, correlationId: principal.correlationId })) throw new ResearchError("RESEARCH_STALE");
  }

  async estimateRun(principal: PrincipalContext, rawInput: unknown) {
    const input = estimateResearchRunInputSchema.parse(rawInput);
    await this.requireAccess(principal, "research:estimate", input);
    const research = await this.repository.findById(input);
    if (!research) throw new ResearchError("RESEARCH_NOT_FOUND_OR_FORBIDDEN");
    const estimatedCostKopecks = this.pricing.estimateRunCostKopecks(research.queries.length);
    if (!Number.isSafeInteger(estimatedCostKopecks) || estimatedCostKopecks < 0) {
      throw new ResearchError("RESEARCH_PRICING_UNAVAILABLE");
    }
    const committed = await this.repository.getCommittedSpend(input.organizationId, this.now());
    if (committed.dailyKopecks + estimatedCostKopecks > DAILY_LIMIT_KOPECKS) throw new ResearchError("RESEARCH_DAILY_LIMIT_EXCEEDED");
    if (committed.monthlyKopecks + estimatedCostKopecks > MONTHLY_LIMIT_KOPECKS) throw new ResearchError("RESEARCH_MONTHLY_LIMIT_EXCEEDED");
    const run = await this.repository.createRunEstimate({ ref: input, idempotencyKey: input.idempotencyKey, queryCount: research.queries.length, estimatedCostKopecks });
    return {
      runId: run.runId,
      queryCount: research.queries.length,
      estimatedCostKopecks,
      dailyCommittedKopecks: committed.dailyKopecks,
      monthlyCommittedKopecks: committed.monthlyKopecks,
      dailyLimitKopecks: DAILY_LIMIT_KOPECKS,
      monthlyLimitKopecks: MONTHLY_LIMIT_KOPECKS,
      confirmationRequired: true as const,
    };
  }

  async confirmAndQueue(principal: PrincipalContext, rawInput: unknown) {
    const input = confirmResearchRunInputSchema.parse(rawInput);
    await this.requireAccess(principal, "research:run", input);
    const actorId = principalUserId(principal);
    if (!actorId) throw new ResearchError("RESEARCH_NOT_FOUND_OR_FORBIDDEN");
    const result = await this.repository.confirmRun({
      ref: input,
      runId: input.runId,
      expectedEstimatedCostKopecks: input.expectedEstimatedCostKopecks,
      actorId,
      correlationId: principal.correlationId,
      now: this.now(),
    });
    if (!result) throw new ResearchError("RESEARCH_NOT_FOUND_OR_FORBIDDEN");
    return result;
  }
}
