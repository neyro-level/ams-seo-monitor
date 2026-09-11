import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { PrincipalContext } from "../../../platform/authorization/principal.ts";
import type { ResearchService } from "../application/research-service.ts";
import type { ResearchReportService } from "../application/research-report-service.ts";

const ref = {
  organizationId: z.string().min(1).max(128),
  projectId: z.string().min(1).max(128),
  researchId: z.string().min(1).max(128),
};

function success(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: value as Record<string, unknown> };
}

async function safely(operation: () => Promise<unknown>) {
  try {
    return success(await operation());
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : "RESEARCH_OPERATION_FAILED";
    return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ error: code }) }] };
  }
}

export function createResearchMcpServer(input: { principal: PrincipalContext; research: ResearchService; reports: ResearchReportService }) {
  const server = new McpServer({ name: "ams-impulse-research", version: "1.0.0" });

  server.registerTool("research_create_draft", {
    description: "Создать черновик исследования в явно доступном проекте Инструментов.",
    inputSchema: z.object({ organizationId: ref.organizationId, projectId: ref.projectId, title: z.string().min(2).max(180), brief: z.string().max(5000).default(""), queries: z.array(z.string().min(2).max(500)).min(1).max(20) }),
  }, (args) => safely(() => input.research.create(input.principal, args)));

  server.registerTool("research_estimate_run", {
    description: "Рассчитать серверную стоимость запуска без платных обращений к провайдеру.",
    inputSchema: z.object({ ...ref, idempotencyKey: z.string().min(8).max(128) }),
  }, (args) => safely(() => input.research.estimateRun(input.principal, args)));

  server.registerTool("research_confirm_and_run", {
    description: "Подтвердить сохранённую стоимость и поставить исследование в очередь.",
    inputSchema: z.object({ ...ref, runId: z.string().min(1).max(128), expectedEstimatedCostKopecks: z.number().int().min(0) }),
  }, (args) => safely(() => input.research.confirmAndQueue(input.principal, args)));

  server.registerTool("research_get_run", {
    description: "Получить статус, доказательства и карту конкурентов по запуску.",
    inputSchema: z.object({ ...ref, runId: z.string().min(1).max(128) }),
  }, (args) => safely(() => input.reports.getRun(input.principal, args)));

  server.registerTool("research_create_export", {
    description: "Создать приватный CSV-экспорт завершённого исследования.",
    inputSchema: z.object({ ...ref, runId: z.string().min(1).max(128), idempotencyKey: z.string().min(8).max(128) }),
  }, (args) => safely(() => input.reports.createExport(input.principal, args)));

  server.registerTool("research_get_export_download", {
    description: "Получить одноразовую короткоживущую ссылку на доступный CSV-экспорт.",
    inputSchema: z.object({ ...ref, exportId: z.string().min(1).max(128) }),
  }, (args) => safely(() => input.reports.createDownload(input.principal, args)));

  return server;
}
