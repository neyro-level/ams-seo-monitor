import { z } from "zod";
import { metricaSiteAuditSchema } from "./metrica-source";
import { reportPeriodKeySchema } from "./report";
import { slugPattern } from "./registry";
import { webmasterSiteDataSchema } from "./webmaster-source";

export const siteSourceBundleSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime({ offset: true }),
  clientSlug: z.string().regex(slugPattern),
  siteSlug: z.string().regex(slugPattern),
  periodKey: reportPeriodKeySchema,
  current: z.object({
    webmaster: webmasterSiteDataSchema.nullable(),
    metrica: metricaSiteAuditSchema.nullable(),
  }),
  previous: z.object({
    webmaster: webmasterSiteDataSchema.nullable(),
    metrica: metricaSiteAuditSchema.nullable(),
  }),
});

export type SiteSourceBundle = z.infer<typeof siteSourceBundleSchema>;
