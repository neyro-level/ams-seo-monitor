"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { defineAction } from "../../platform/actions/define-action.ts";
import { getCurrentPrincipalState } from "../../modules/identity-access/server.ts";
import { IdentityAdminError } from "../../modules/identity-access/contracts.ts";
import {
  createMembership,
  createOrganization,
  removeMembership,
  updateMembership,
  updateOrganization,
} from "../../modules/identity-access/server.ts";
import {
  PlatformOperationsAdminError,
  type RequestProjectSyncInput,
} from "../../modules/platform-operations/contracts.ts";
import { requestProjectSync } from "../../modules/platform-operations/server.ts";
import {
  ProjectRegistryAdminError,
  type CreateGoalDefinitionInput,
  type CreateProviderConnectionInput,
  type CreateQueryClusterProfileInput,
  type CreateSiteInput,
  type CreateThresholdProfileInput,
  type CreateTrackedQuerySetInput,
  type UpdateGoalDefinitionInput,
  type UpdateProviderConnectionInput,
  type UpdateQueryClusterProfileInput,
  type UpdateSiteInput,
  type UpdateThresholdProfileInput,
  type UpdateTrackedQuerySetInput,
} from "../../modules/project-registry/contracts.ts";
import {
  saveGoalDefinition,
  saveProviderConnection,
  saveQueryClusterProfile,
  saveSite,
  saveThresholdProfile,
  saveTrackedQuerySet,
} from "../../modules/project-registry/server.ts";
import type {
  CreateMembershipInput,
  CreateOrganizationInput,
  RemoveMembershipInput,
  UpdateMembershipInput,
  UpdateOrganizationInput,
} from "../../modules/identity-access/contracts.ts";

async function currentPrincipal() {
  const state = await getCurrentPrincipalState();
  if (!state) redirect("/?login=1");
  return state.principal;
}

function failure(error: unknown, correlationId: string) {
  if (error instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
    }
    return {
      ok: false as const,
      code: "PLATFORM_ADMIN_INPUT_INVALID",
      message: "Проверьте заполненные поля.",
      correlationId,
      fieldErrors,
    };
  }

  const code =
    error instanceof IdentityAdminError
      ? error.code
      : error instanceof ProjectRegistryAdminError
        ? error.code
        : error instanceof PlatformOperationsAdminError
          ? error.code
          : "PLATFORM_ADMIN_ACTION_FAILED";

  const messages: Record<string, string> = {
    IDENTITY_ADMIN_ACCESS_DENIED: "Недостаточно прав для Platform Admin.",
    ORGANIZATION_NOT_FOUND_OR_FORBIDDEN: "Организация недоступна или уже удалена.",
    ORGANIZATION_STALE: "Организация уже изменена. Обновите страницу.",
    ORGANIZATION_SLUG_CONFLICT: "Организация с таким slug уже существует.",
    MEMBERSHIP_NOT_FOUND_OR_FORBIDDEN: "Доступ пользователя недоступен или уже удалён.",
    MEMBERSHIP_STALE: "Запись доступа уже изменена. Обновите страницу.",
    MEMBERSHIP_ALREADY_EXISTS: "У пользователя уже есть доступ в эту организацию.",
    MEMBERSHIP_REFERENCE_INVALID: "Организация или пользователь недоступны.",
    PROJECT_REGISTRY_ADMIN_ACCESS_DENIED: "Недостаточно прав для изменения реестра.",
    SITE_CONFLICT: "Сайт с таким slug уже существует в проекте.",
    SITE_NOT_FOUND_OR_FORBIDDEN: "Сайт недоступен или уже удалён.",
    SITE_REFERENCE_INVALID: "Выбранный проект недоступен.",
    SITE_STALE: "Сайт уже изменён. Обновите страницу.",
    PROVIDER_CONNECTION_CONFLICT: "Подключение этого источника для сайта уже существует.",
    PROVIDER_CONNECTION_NOT_FOUND_OR_FORBIDDEN: "Подключение источника недоступно.",
    PROVIDER_CONNECTION_REFERENCE_INVALID: "Выбранный сайт недоступен.",
    PROVIDER_CONNECTION_STALE: "Подключение уже изменено. Обновите страницу.",
    GOAL_DEFINITION_CONFLICT: "Цель с таким external ID уже существует в проекте.",
    GOAL_DEFINITION_NOT_FOUND_OR_FORBIDDEN: "Цель недоступна.",
    GOAL_DEFINITION_REFERENCE_INVALID: "Проект или выбранные сайты недоступны.",
    GOAL_DEFINITION_STALE: "Цель уже изменена. Обновите страницу.",
    TRACKED_QUERY_SET_CONFLICT: "Для сайта уже существует набор запросов.",
    TRACKED_QUERY_SET_NOT_FOUND_OR_FORBIDDEN: "Набор запросов недоступен.",
    TRACKED_QUERY_SET_REFERENCE_INVALID: "Выбранный сайт недоступен.",
    TRACKED_QUERY_SET_STALE: "Набор запросов уже изменён. Обновите страницу.",
    THRESHOLD_PROFILE_NOT_FOUND_OR_FORBIDDEN: "Пороговый профиль недоступен.",
    THRESHOLD_PROFILE_REFERENCE_INVALID: "Пороговый профиль недоступен.",
    THRESHOLD_PROFILE_SLUG_CONFLICT: "Пороговый профиль с таким slug уже существует.",
    THRESHOLD_PROFILE_STALE: "Пороговый профиль уже изменён. Обновите страницу.",
    QUERY_CLUSTER_PROFILE_NOT_FOUND_OR_FORBIDDEN: "Кластерный профиль недоступен.",
    QUERY_CLUSTER_PROFILE_REFERENCE_INVALID: "Кластерный профиль недоступен.",
    QUERY_CLUSTER_PROFILE_SLUG_CONFLICT: "Кластерный профиль с таким slug уже существует.",
    QUERY_CLUSTER_PROFILE_STALE: "Кластерный профиль уже изменён. Обновите страницу.",
    PLATFORM_OPERATIONS_ADMIN_ACCESS_DENIED: "Недостаточно прав для операций платформы.",
    PROJECT_SYNC_NOT_FOUND: "Проект для синхронизации не найден.",
    PROJECT_SYNC_INVALID_SCOPE: "Проект недоступен для этого действия.",
  };

  return {
    ok: false as const,
    code,
    message: messages[code] ?? "Не удалось сохранить изменения.",
    correlationId,
    fieldErrors: {},
  };
}

function revalidateAdmin(resource: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/${resource}`);
}

export const createOrganizationAction = defineAction(async (input: CreateOrganizationInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await createOrganization(principal, input);
    revalidateAdmin("organizations");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const updateOrganizationAction = defineAction(async (input: UpdateOrganizationInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await updateOrganization(principal, input);
    revalidateAdmin("organizations");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const createMembershipAction = defineAction(async (input: CreateMembershipInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await createMembership(principal, input);
    revalidateAdmin("memberships");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const updateMembershipAction = defineAction(async (input: UpdateMembershipInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await updateMembership(principal, input);
    revalidateAdmin("memberships");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const removeMembershipAction = defineAction(async (input: RemoveMembershipInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await removeMembership(principal, input);
    revalidateAdmin("memberships");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const createSiteAction = defineAction(async (input: CreateSiteInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveSite(principal, input);
    revalidateAdmin("sites");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const updateSiteAction = defineAction(async (input: UpdateSiteInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveSite(principal, input);
    revalidateAdmin("sites");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const createProviderConnectionAction = defineAction(async (input: CreateProviderConnectionInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveProviderConnection(principal, input);
    revalidateAdmin("providers");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const updateProviderConnectionAction = defineAction(async (input: UpdateProviderConnectionInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveProviderConnection(principal, input);
    revalidateAdmin("providers");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const createGoalDefinitionAction = defineAction(async (input: CreateGoalDefinitionInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveGoalDefinition(principal, input);
    revalidateAdmin("goals");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const updateGoalDefinitionAction = defineAction(async (input: UpdateGoalDefinitionInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveGoalDefinition(principal, input);
    revalidateAdmin("goals");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const createTrackedQuerySetAction = defineAction(async (input: CreateTrackedQuerySetInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveTrackedQuerySet(principal, input);
    revalidateAdmin("tracked-queries");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const updateTrackedQuerySetAction = defineAction(async (input: UpdateTrackedQuerySetInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveTrackedQuerySet(principal, input);
    revalidateAdmin("tracked-queries");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const createThresholdProfileAction = defineAction(async (input: CreateThresholdProfileInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveThresholdProfile(principal, input);
    revalidateAdmin("profiles");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const updateThresholdProfileAction = defineAction(async (input: UpdateThresholdProfileInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveThresholdProfile(principal, input);
    revalidateAdmin("profiles");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const createQueryClusterProfileAction = defineAction(async (input: CreateQueryClusterProfileInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveQueryClusterProfile(principal, input);
    revalidateAdmin("profiles");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const updateQueryClusterProfileAction = defineAction(async (input: UpdateQueryClusterProfileInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await saveQueryClusterProfile(principal, input);
    revalidateAdmin("profiles");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const requestProjectSyncAction = defineAction(async (input: RequestProjectSyncInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await requestProjectSync(principal, input);
    revalidateAdmin("operations");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});
