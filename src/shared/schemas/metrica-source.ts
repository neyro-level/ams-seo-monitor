import { z } from "zod";

export const metricaSafeErrorCodeSchema = z.enum([
  "TOKEN_INACTIVE",
  "MISSING_ENV",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "SERVER_ERROR",
  "NETWORK_ERROR",
  "COUNTER_MISSING",
  "INVALID_RESPONSE",
]);

export const metricaPermissionSchema = z.enum(["own", "view", "edit", "unknown"]);

export const metricaCounterAccessSchema = z.object({
  counterId: z.string().min(1),
  site: z.string().min(1),
  permission: metricaPermissionSchema,
  name: z.string().min(1),
  timeZoneName: z.string().nullable(),
  timeZoneOffsetMinutes: z.number().int().nullable(),
});

export const metricaGoalSchema = z.object({
  goalId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  isFavorite: z.boolean().nullable(),
  status: z.string().nullable(),
});

export const metricaSampleMetaSchema = z.object({
  sampled: z.boolean(),
  containsSensitiveData: z.boolean(),
  sampleShare: z.number().nullable(),
  sampleSize: z.number().nullable(),
  sampleSpace: z.number().nullable(),
});

export const metricaTotalsRowSchema = z.object({
  metric: z.string().min(1),
  value: z.number().nullable(),
});

export const metricaPreflightSchema = z.object({
  schemaVersion: z.literal(1),
  checkedAt: z.string().datetime({ offset: true }),
  access: metricaCounterAccessSchema,
  goals: z.array(metricaGoalSchema),
});

export type MetricaSafeErrorCode = z.infer<typeof metricaSafeErrorCodeSchema>;
export type MetricaCounterAccess = z.infer<typeof metricaCounterAccessSchema>;
export type MetricaGoal = z.infer<typeof metricaGoalSchema>;
export type MetricaSampleMeta = z.infer<typeof metricaSampleMetaSchema>;
export type MetricaPreflight = z.infer<typeof metricaPreflightSchema>;
