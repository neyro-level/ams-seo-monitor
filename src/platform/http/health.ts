import { z } from "zod";
import { correlationIdSchema } from "./correlation";

const releaseShaSchema = z.string().regex(/^[0-9a-f]{40}$/).nullable();

export const liveHealthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("ams-seo-monitor"),
  releaseSha: releaseShaSchema,
  correlationId: correlationIdSchema,
  time: z.string().datetime({ offset: true }),
});

export const readyHealthSchema = z.object({
  status: z.literal("ready"),
  service: z.literal("ams-seo-monitor"),
  releaseSha: releaseShaSchema,
  correlationId: correlationIdSchema,
  dependencies: z.object({
    postgresql: z.literal("ready"),
    auth: z.literal("configured"),
  }),
});

export type LiveHealth = z.infer<typeof liveHealthSchema>;
export type ReadyHealth = z.infer<typeof readyHealthSchema>;
