"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getAdminCmsService,
  getProjectService,
  getReliabilityService,
} from "../../infrastructure/service-container.ts";
import {
  getCurrentActorContext,
  getCurrentCabinetRedirect,
} from "../../modules/identity-access/server.ts";
import { hasPermission } from "../../modules/identity-access/index.ts";
import type { AdminCommandName } from "../../modules/admin-cms/index.ts";


export interface AdminCommandResult {
  ok: boolean;
  message: string;
}

const identifier = z.string().trim().min(1).max(128);
const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalId = z.string().trim().transform((value) => value || undefined).optional();
const checkbox = z.union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")]).transform((value) => value === true || value === "true" || value === "on");
const finiteNumber = z.coerce.number().finite();

const organizationSchema = z.object({ id: optionalId, slug, name: z.string().trim().min(2).max(160) });
const membershipSchema = z.object({ organizationId: identifier, userId: identifier, role: z.string().trim().min(2).max(64) });
const removeMembershipSchema = membershipSchema.pick({
  organizationId: true,
  userId: true,
});
const projectSchema = z.object({
  id: optionalId,
  organizationId: identifier,
  slug,
  name: z.string().trim().min(2).max(160),
  status: z.enum(["ACTIVE", "PLANNED", "DISABLED"]),
  thresholdProfileId: identifier,
  clusterProfileId: identifier,
});
const siteSchema = z.object({
  id: optionalId,
  projectId: identifier,
  slug,
  name: z.string().trim().min(2).max(160),
  url: z.url(),
  timezone: z.string().trim().min(1).max(64),
  enabled: checkbox,
});
const sensitiveSettingKey = /(token|secret|password|credential|authorization|api.?key)/i;
const settingsSchema = z.string().trim().max(10_000).transform((value, context) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    const validated = z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .safeParse(parsed);
    if (!validated.success || Object.keys(validated.data).some((key) => sensitiveSettingKey.test(key))) {
      throw new Error("INVALID_SETTINGS");
    }
    return validated.data;
  } catch {
    context.addIssue({
      code: "custom",
      message: "Разрешён только плоский nonsecret JSON без token, password, secret и API key",
    });
    return z.NEVER;
  }
});
const providerSchema = z.object({
  siteId: identifier,
  provider: z.enum(["YANDEX_WEBMASTER", "YANDEX_METRIKA", "TOPVISOR"]),
  externalId: z.string().trim().transform((value) => value || null),
  enabled: checkbox,
  settingsJson: settingsSchema,
});
const goalSchema = z.object({
  projectId: identifier,
  externalGoalId: identifier,
  label: z.string().trim().min(2).max(160),
  category: z.enum(["LEAD_SUBMIT", "PHONE_CLICK", "MESSENGER_CLICK", "FORM_START", "FILE_DOWNLOAD", "OTHER"]),
  direction: z.enum(["PRIMARY", "SECONDARY"]),
  includeInSeoConversion: checkbox,
});
const trackedQuerySchema = z.object({
  siteId: identifier,
  source: z.enum(["OWNER_PROVIDED", "TOPVISOR"]),
  baselineLabel: z.string().trim().min(2).max(160),
  queries: z.string().max(500_000).transform((value) => [...new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))]).pipe(z.array(z.string().min(1).max(500)).min(1).max(5000)),
});
const thresholdSchema = z.object({
  slug,
  minimumShows: z.coerce.number().int().min(0),
  maximumCtrPercent: finiteNumber,
  maximumAveragePosition: finiteNumber,
  showsDropPercent: finiteNumber,
  clicksDropPercent: finiteNumber,
  positionWorsenedDelta: finiteNumber,
  pagesInSearchDropPercent: finiteNumber,
  organicVisitsDropPercent: finiteNumber,
  goalConversionDropPercent: finiteNumber,
});
const clusterGroupSchema = z.object({
  slug,
  label: z.string().trim().min(1).max(160),
  order: z.number().int().min(0),
  brandTerms: z.array(z.string().trim().min(1)).max(500),
  terms: z.array(z.string().trim().min(1)).max(500),
});
const clusterSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(160),
  groupsJson: z.string().max(200_000).transform((value, context) => {
    try {
      const parsed = clusterGroupSchema.array().min(1).safeParse(JSON.parse(value) as unknown);
      if (!parsed.success) throw new Error("INVALID_GROUPS");
      return parsed.data;
    } catch {
      context.addIssue({ code: "custom", message: "Группы должны соответствовать документированному JSON-массиву" });
      return z.NEVER;
    }
  }),
});
const syncSchema = z.object({ projectSlug: slug, idempotencyKey: identifier });

async function requireAdmin() {
  const onboardingRedirect = await getCurrentCabinetRedirect();
  if (onboardingRedirect) redirect(onboardingRedirect);
  const actor = await getCurrentActorContext();
  if (!actor) redirect("/?login=1");
  if (!hasPermission(actor, "platform:manage")) redirect("/dashboard/");
  return actor;
}

function failure(error: unknown): AdminCommandResult {
  if (error instanceof z.ZodError) {
    return { ok: false, message: error.issues[0]?.message ?? "Проверьте поля формы" };
  }
  if (error instanceof Error && error.message === "ADMIN_ACCESS_DENIED") {
    return { ok: false, message: "Недостаточно прав" };
  }
  return { ok: false, message: "Команда не выполнена. Проверьте уникальность и связанные записи." };
}

export async function executeAdminCommand(
  command: AdminCommandName,
  values: Record<string, unknown>,
): Promise<AdminCommandResult> {
  const actor = await requireAdmin();
  const admin = getAdminCmsService();

  try {
    switch (command) {
      case "saveOrganization":
        await admin.saveOrganization(actor, organizationSchema.parse(values));
        break;
      case "saveMembership":
        await admin.saveMembership(actor, membershipSchema.parse(values));
        break;
      case "removeMembership":
        await admin.removeMembership(actor, removeMembershipSchema.parse(values));
        break;
      case "saveProject":
        await admin.saveProject(actor, projectSchema.parse(values));
        break;
      case "saveSite":
        await admin.saveSite(actor, siteSchema.parse(values));
        break;
      case "saveProviderConnection": {
        const input = providerSchema.parse(values);
        await admin.saveProviderConnection(actor, { ...input, settings: input.settingsJson });
        break;
      }
      case "saveGoal":
        await admin.saveGoal(actor, goalSchema.parse(values));
        break;
      case "replaceTrackedQuerySet":
        await admin.replaceTrackedQuerySet(actor, trackedQuerySchema.parse(values));
        break;
      case "saveThresholdProfile":
        await admin.saveThresholdProfile(actor, thresholdSchema.parse(values));
        break;
      case "saveClusterProfile": {
        const input = clusterSchema.parse(values);
        await admin.saveClusterProfile(actor, { slug: input.slug, name: input.name, groups: input.groupsJson });
        break;
      }
      case "requestProjectSync": {
        const input = syncSchema.parse(values);
        const project = await getProjectService().getProjectAccessForUser(actor, input.projectSlug);
        if (!project) throw new Error("PROJECT_NOT_FOUND");
        await getReliabilityService().enqueue({
          organizationId: project.organizationId,
          organizationScope: project.organizationId,
          idempotencyScope: "admin.project-sync",
          idempotencyKey: input.idempotencyKey,
          topic: "project.sync.requested",
          payload: { projectSlug: project.projectSlug, trigger: "manual" },
          actorType: "USER",
          actorId: actor.userId,
          action: "project.sync.request",
          entityType: "Project",
          entityId: project.projectId,
          source: "admin-cms",
          correlationId: actor.correlationId,
        });
        break;
      }
    }
  } catch (error) {
    return failure(error);
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Данные сохранены" };
}
