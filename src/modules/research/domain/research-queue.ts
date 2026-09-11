import { z } from "zod";

export const RESEARCH_RUN_QUEUE = "research.run.v1";
export const RESEARCH_RUN_SCHEMA = 1;
export const researchRunJobSchema = z.object({
  schemaVersion: z.literal(RESEARCH_RUN_SCHEMA),
  toolsOrganizationId: z.string().trim().min(1),
  toolsProjectId: z.string().trim().min(1),
  researchId: z.string().trim().min(1),
  runId: z.string().trim().min(1),
  correlationId: z.string().uuid(),
});
export type ResearchRunJob = z.infer<typeof researchRunJobSchema>;
