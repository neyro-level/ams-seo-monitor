"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { defineAction } from "../../../platform/actions/define-action.ts";
import { getCurrentPrincipalState } from "../../../platform/auth/principal-session.ts";
import { ProjectError } from "../../../modules/project-registry/index.ts";
import {
  changeProjectStatus,
  createProject,
  updateProjectSettings,
} from "../../../modules/project-registry/server.ts";
import type {
  ChangeProjectStatusInput,
  CreateProjectInput,
  UpdateProjectSettingsInput,
} from "../../../modules/project-registry/contracts.ts";

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
      code: "PROJECT_INPUT_INVALID",
      message: "Проверьте заполненные поля.",
      correlationId,
      fieldErrors,
    };
  }

  const code = error instanceof ProjectError ? error.code : "PROJECT_ACTION_FAILED";
  const messages: Record<string, string> = {
    PROJECT_ACCESS_DENIED: "Недостаточно прав для изменения проекта.",
    PROJECT_NOT_FOUND_OR_FORBIDDEN: "Проект недоступен или уже удалён.",
    PROJECT_STALE: "Проект уже изменён. Обновите страницу и повторите действие.",
    PROJECT_SLUG_CONFLICT: "Проект с таким slug уже существует.",
    PROJECT_REFERENCE_INVALID: "Выбранная организация или профиль недоступны.",
  };
  return {
    ok: false as const,
    code,
    message: messages[code] ?? "Не удалось сохранить проект.",
    correlationId,
    fieldErrors: {},
  };
}

export const createProjectAction = defineAction(async (input: CreateProjectInput) => {
  const principal = await currentPrincipal();
  try {
    const data = await createProject(principal, input);
    revalidatePath("/admin/projects");
    return { ok: true as const, data };
  } catch (error) {
    return failure(error, principal.correlationId);
  }
});

export const changeProjectStatusAction = defineAction(
  async (input: ChangeProjectStatusInput) => {
    const principal = await currentPrincipal();
    try {
      const data = await changeProjectStatus(principal, input);
      revalidatePath("/admin/projects");
      return { ok: true as const, data };
    } catch (error) {
      return failure(error, principal.correlationId);
    }
  },
);

export const updateProjectSettingsAction = defineAction(
  async (input: UpdateProjectSettingsInput) => {
    const principal = await currentPrincipal();
    try {
      const data = await updateProjectSettings(principal, input);
      revalidatePath("/admin/projects");
      return { ok: true as const, data };
    } catch (error) {
      return failure(error, principal.correlationId);
    }
  },
);
