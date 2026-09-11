import { describe, expect, it } from "vitest";
import { ResearchService, type ResearchRecord, type ResearchRepository } from "../src/modules/research/index.ts";
import { AuthorizationService } from "../src/platform/authorization/authorization-service.ts";
import { createPlatformAnalystPrincipal, createTenantUserPrincipal } from "./helpers/principal.ts";

class MemoryResearchRepository implements ResearchRepository {
  records: ResearchRecord[] = [];
  dailyKopecks = 0;
  monthlyKopecks = 0;
  runIds = new Map<string, string>();

  async listByProject(organizationId: string, projectId: string) { return this.records.filter((record) => record.organizationId === organizationId && record.projectId === projectId && record.status !== "ARCHIVED"); }
  async findById(ref: { organizationId: string; projectId: string; researchId: string }) { return this.records.find((record) => record.id === ref.researchId && record.organizationId === ref.organizationId && record.projectId === ref.projectId) ?? null; }
  async listRuns() { return []; }
  async create(input: Parameters<ResearchRepository["create"]>[0]) {
    const record: ResearchRecord = { id: `research-${this.records.length + 1}`, organizationId: input.organizationId, projectId: input.projectId, title: input.title, brief: input.brief, status: "DRAFT", version: 1, queries: input.queries.map((text, position) => ({ id: `query-${position}`, text, position })), updatedAt: "2026-09-11T00:00:00.000Z" };
    this.records.push(record); return record;
  }
  async update(input: Parameters<ResearchRepository["update"]>[0]) {
    const record = await this.findById(input); if (!record || record.version !== input.version) return null;
    record.title = input.title; record.brief = input.brief; record.version += 1; record.queries = input.queries.map((text, position) => ({ id: `updated-${position}`, text, position })); return record;
  }
  async archive(input: Parameters<ResearchRepository["archive"]>[0]) { const record = await this.findById(input); if (!record || record.version !== input.version) return false; record.status = "ARCHIVED"; record.version += 1; return true; }
  async getCommittedSpend() { return { dailyKopecks: this.dailyKopecks, monthlyKopecks: this.monthlyKopecks }; }
  async createRunEstimate(input: Parameters<ResearchRepository["createRunEstimate"]>[0]) { const runId = this.runIds.get(input.idempotencyKey) ?? `run-${this.runIds.size + 1}`; this.runIds.set(input.idempotencyKey, runId); return { runId }; }
  async confirmRun(input: Parameters<ResearchRepository["confirmRun"]>[0]) { return input.expectedEstimatedCostKopecks >= 0 ? { runId: input.runId, outboxEventId: "outbox-1" } : null; }
}

const authorization = new AuthorizationService({
  async listProjectGrants(userId, product) {
    const records = userId === "analyst" ? [{ product: "tools" as const, organizationId: "atlas", projectId: "secondary", role: "ANALYST" as const }] : [];
    return records.filter((grant) => !product || grant.product === product);
  },
});
const pricing = { estimateRunCostKopecks: (queryCount: number) => queryCount * 125 };

describe("ResearchService", () => {
  it("creates research only inside an explicitly assigned Tools project", async () => {
    const repository = new MemoryResearchRepository();
    const service = new ResearchService(repository, authorization, pricing);
    const principal = createPlatformAnalystPrincipal("analyst");
    const created = await service.create(principal, { organizationId: "atlas", projectId: "secondary", title: "Рынок вторички", brief: "Москва", queries: ["купить квартиру", "цены на вторичку"] });
    expect(created).toMatchObject({ projectId: "secondary", status: "DRAFT", version: 1 });
    await expect(service.create(principal, { organizationId: "atlas", projectId: "sites", title: "Чужой проект", queries: ["создание сайтов"] })).rejects.toMatchObject({ code: "RESEARCH_NOT_FOUND_OR_FORBIDDEN" });
  });

  it("does not grant Tools access to a client through an SEO membership", async () => {
    const service = new ResearchService(new MemoryResearchRepository(), authorization, pricing);
    const client = createTenantUserPrincipal({ userId: "client", organizationId: "atlas" });
    await expect(service.list(client, "atlas", "secondary")).rejects.toMatchObject({ code: "RESEARCH_NOT_FOUND_OR_FORBIDDEN" });
  });

  it("estimates once and requires confirmation without starting provider work", async () => {
    const repository = new MemoryResearchRepository();
    const service = new ResearchService(repository, authorization, pricing, () => new Date("2026-09-11T10:00:00Z"));
    const principal = createPlatformAnalystPrincipal("analyst");
    const research = await service.create(principal, { organizationId: "atlas", projectId: "secondary", title: "Атлас", queries: ["один", "два"] });
    const first = await service.estimateRun(principal, { organizationId: "atlas", projectId: "secondary", researchId: research.id, idempotencyKey: "estimate-001" });
    const repeated = await service.estimateRun(principal, { organizationId: "atlas", projectId: "secondary", researchId: research.id, idempotencyKey: "estimate-001" });
    expect(first).toMatchObject({ runId: repeated.runId, queryCount: 2, estimatedCostKopecks: 250, confirmationRequired: true });
  });

  it("blocks the daily and monthly budget before creating a run", async () => {
    const repository = new MemoryResearchRepository();
    const service = new ResearchService(repository, authorization, { estimateRunCostKopecks: () => 100 });
    const principal = createPlatformAnalystPrincipal("analyst");
    const research = await service.create(principal, { organizationId: "atlas", projectId: "secondary", title: "Лимит", queries: ["один"] });
    repository.dailyKopecks = 49_950;
    await expect(service.estimateRun(principal, { organizationId: "atlas", projectId: "secondary", researchId: research.id, idempotencyKey: "estimate-002" })).rejects.toMatchObject({ code: "RESEARCH_DAILY_LIMIT_EXCEEDED" });
    repository.dailyKopecks = 0; repository.monthlyKopecks = 299_950;
    await expect(service.estimateRun(principal, { organizationId: "atlas", projectId: "secondary", researchId: research.id, idempotencyKey: "estimate-003" })).rejects.toMatchObject({ code: "RESEARCH_MONTHLY_LIMIT_EXCEEDED" });
  });

  it("rechecks run permission before queuing paid work", async () => {
    const repository = new MemoryResearchRepository();
    const service = new ResearchService(repository, authorization, pricing);
    const analyst = createPlatformAnalystPrincipal("analyst");
    const research = await service.create(analyst, { organizationId: "atlas", projectId: "secondary", title: "Запуск", queries: ["один"] });
    await expect(service.confirmAndQueue(analyst, { organizationId: "atlas", projectId: "secondary", researchId: research.id, runId: "run-1", expectedEstimatedCostKopecks: 100 })).resolves.toEqual({ runId: "run-1", outboxEventId: "outbox-1" });
    const client = createTenantUserPrincipal({ userId: "client", organizationId: "atlas" });
    await expect(service.confirmAndQueue(client, { organizationId: "atlas", projectId: "secondary", researchId: research.id, runId: "run-1", expectedEstimatedCostKopecks: 100 })).rejects.toMatchObject({ code: "RESEARCH_NOT_FOUND_OR_FORBIDDEN" });
  });
});
