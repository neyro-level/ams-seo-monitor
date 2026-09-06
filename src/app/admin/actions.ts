"use server";

import { defineAction } from "../../platform/actions/define-action.ts";
import type { PrincipalContext } from "../../platform/authorization/principal.ts";
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

function mapError(error: unknown) {
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
    code,
    message: messages[code] ?? "Не удалось сохранить изменения.",
  };
}

function platformAdminAction<TInput, TResult>(
  resource: string,
  execute: (principal: PrincipalContext, input: TInput) => Promise<TResult>,
) {
  return defineAction<TInput, TResult>({
    execute: ({ principal, input }) => execute(principal, input),
    mapError,
    inputError: {
      code: "PLATFORM_ADMIN_INPUT_INVALID",
      message: "Проверьте заполненные поля.",
    },
    revalidate: [
      { path: "/admin", type: "layout" },
      { path: `/admin/${resource}` },
    ],
  });
}

export const createOrganizationAction = platformAdminAction<CreateOrganizationInput, Awaited<ReturnType<typeof createOrganization>>>("organizations", createOrganization);
export const updateOrganizationAction = platformAdminAction<UpdateOrganizationInput, Awaited<ReturnType<typeof updateOrganization>>>("organizations", updateOrganization);
export const createMembershipAction = platformAdminAction<CreateMembershipInput, Awaited<ReturnType<typeof createMembership>>>("memberships", createMembership);
export const updateMembershipAction = platformAdminAction<UpdateMembershipInput, Awaited<ReturnType<typeof updateMembership>>>("memberships", updateMembership);
export const removeMembershipAction = platformAdminAction<RemoveMembershipInput, Awaited<ReturnType<typeof removeMembership>>>("memberships", removeMembership);
export const createSiteAction = platformAdminAction<CreateSiteInput, Awaited<ReturnType<typeof saveSite>>>("sites", saveSite);
export const updateSiteAction = platformAdminAction<UpdateSiteInput, Awaited<ReturnType<typeof saveSite>>>("sites", saveSite);
export const createProviderConnectionAction = platformAdminAction<CreateProviderConnectionInput, Awaited<ReturnType<typeof saveProviderConnection>>>("providers", saveProviderConnection);
export const updateProviderConnectionAction = platformAdminAction<UpdateProviderConnectionInput, Awaited<ReturnType<typeof saveProviderConnection>>>("providers", saveProviderConnection);
export const createGoalDefinitionAction = platformAdminAction<CreateGoalDefinitionInput, Awaited<ReturnType<typeof saveGoalDefinition>>>("goals", saveGoalDefinition);
export const updateGoalDefinitionAction = platformAdminAction<UpdateGoalDefinitionInput, Awaited<ReturnType<typeof saveGoalDefinition>>>("goals", saveGoalDefinition);
export const createTrackedQuerySetAction = platformAdminAction<CreateTrackedQuerySetInput, Awaited<ReturnType<typeof saveTrackedQuerySet>>>("tracked-queries", saveTrackedQuerySet);
export const updateTrackedQuerySetAction = platformAdminAction<UpdateTrackedQuerySetInput, Awaited<ReturnType<typeof saveTrackedQuerySet>>>("tracked-queries", saveTrackedQuerySet);
export const createThresholdProfileAction = platformAdminAction<CreateThresholdProfileInput, Awaited<ReturnType<typeof saveThresholdProfile>>>("profiles", saveThresholdProfile);
export const updateThresholdProfileAction = platformAdminAction<UpdateThresholdProfileInput, Awaited<ReturnType<typeof saveThresholdProfile>>>("profiles", saveThresholdProfile);
export const createQueryClusterProfileAction = platformAdminAction<CreateQueryClusterProfileInput, Awaited<ReturnType<typeof saveQueryClusterProfile>>>("profiles", saveQueryClusterProfile);
export const updateQueryClusterProfileAction = platformAdminAction<UpdateQueryClusterProfileInput, Awaited<ReturnType<typeof saveQueryClusterProfile>>>("profiles", saveQueryClusterProfile);
export const requestProjectSyncAction = platformAdminAction<RequestProjectSyncInput, Awaited<ReturnType<typeof requestProjectSync>>>("operations", requestProjectSync);
