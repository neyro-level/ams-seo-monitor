"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useForm,
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormSetError,
} from "react-hook-form";
import { Button } from "../../../../components/ui/button.tsx";
import { Input } from "../../../../components/ui/input.tsx";
import { NativeSelect } from "../../../../components/ui/native-select.tsx";
import {
  changeProjectStatusInputSchema,
  createProjectInputSchema,
  PROJECT_STATUSES,
  updateProjectSettingsInputSchema,
  type ChangeProjectStatusInput,
  type CreateProjectInput,
  type ProjectFormOptions,
  type ProjectListItem,
  type ProjectStatus,
  type UpdateProjectSettingsInput,
} from "../../../../modules/project-registry/contracts.ts";
import {
  changeProjectStatusAction,
  createProjectAction,
  updateProjectSettingsAction,
} from "../actions.ts";

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVE: "Активен",
  PLANNED: "Запланирован",
  DISABLED: "Отключён",
};

type Feedback = { kind: "success" | "error" | "stale"; message: string } | null;

function applyFieldErrors<TValues extends FieldValues>(
  fieldErrors: Record<string, string[]>,
  setError: UseFormSetError<TValues>,
) {
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages[0];
    if (message) setError(field as Path<TValues>, { message });
  }
}

function FeedbackMessage({ feedback, onRefresh }: { feedback: Feedback; onRefresh?: () => void }) {
  if (!feedback) return null;
  return (
    <div
      className={feedback.kind === "success" ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}
      role={feedback.kind === "success" ? "status" : "alert"}
    >
      <span>{feedback.message}</span>
      {feedback.kind === "stale" && onRefresh ? (
        <Button className="ml-2" variant="link" type="button" onClick={onRefresh}>
          Обновить данные
        </Button>
      ) : null}
    </div>
  );
}

const fieldClassName =
  "min-h-11 w-full rounded-xl border border-[var(--crm-border-strong)] bg-white px-3 pr-10 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100";

export function ProjectCreateForm({ options }: { options: ProjectFormOptions }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const defaults: CreateProjectInput = {
    organizationId: options.organizations[0]?.id ?? "",
    slug: "",
    name: "",
    status: "PLANNED",
    thresholdProfileId: options.thresholdProfiles[0]?.id ?? "",
    clusterProfileId: options.clusterProfiles[0]?.id ?? "",
  };
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectInputSchema) as Resolver<CreateProjectInput>,
    defaultValues: defaults,
  });

  const submit = handleSubmit(async (values) => {
    setFeedback(null);
    const result = await createProjectAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, setError);
      setFeedback({ kind: "error", message: result.message });
      return;
    }
    reset(defaults);
    setFeedback({ kind: "success", message: "Проект создан" });
    router.refresh();
  });

  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="min-h-11 cursor-pointer list-none px-5 py-3 text-sm font-semibold text-slate-900">
        Создать проект
      </summary>
      <form className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-3" onSubmit={submit}>
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-slate-800">Организация</span>
          <NativeSelect className={fieldClassName} {...register("organizationId")}>
            {options.organizations.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </NativeSelect>
          {errors.organizationId ? <span className="text-xs text-rose-700">{errors.organizationId.message}</span> : null}
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-slate-800">Название</span>
          <Input {...register("name")} />
          {errors.name ? <span className="text-xs text-rose-700">{errors.name.message}</span> : null}
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-slate-800">Slug</span>
          <Input placeholder="project-slug" {...register("slug")} />
          {errors.slug ? <span className="text-xs text-rose-700">{errors.slug.message}</span> : null}
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-slate-800">Статус</span>
          <NativeSelect className={fieldClassName} {...register("status")}>
            {PROJECT_STATUSES.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </NativeSelect>
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-slate-800">Пороговый профиль</span>
          <NativeSelect className={fieldClassName} {...register("thresholdProfileId")}>
            {options.thresholdProfiles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </NativeSelect>
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-slate-800">Кластерный профиль</span>
          <NativeSelect className={fieldClassName} {...register("clusterProfileId")}>
            {options.clusterProfiles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </NativeSelect>
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
          <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Создаём…" : "Создать"}</Button>
          <FeedbackMessage feedback={feedback} />
        </div>
      </form>
    </details>
  );
}

export function ProjectRowActions({ project, options }: { project: ProjectListItem; options: ProjectFormOptions }) {
  const router = useRouter();
  const [statusFeedback, setStatusFeedback] = useState<Feedback>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<Feedback>(null);
  const statusForm = useForm<ChangeProjectStatusInput>({
    resolver: zodResolver(changeProjectStatusInputSchema) as Resolver<ChangeProjectStatusInput>,
    defaultValues: {
      organizationId: project.organizationId,
      projectId: project.id,
      version: project.version,
      status: project.status,
    },
  });
  const settingsForm = useForm<UpdateProjectSettingsInput>({
    resolver: zodResolver(updateProjectSettingsInputSchema) as Resolver<UpdateProjectSettingsInput>,
    defaultValues: {
      organizationId: project.organizationId,
      projectId: project.id,
      version: project.version,
      name: project.name,
      thresholdProfileId: project.thresholdProfileId,
      clusterProfileId: project.clusterProfileId,
    },
  });

  const submitStatus = statusForm.handleSubmit(async (values) => {
    setStatusFeedback(null);
    const result = await changeProjectStatusAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, statusForm.setError);
      setStatusFeedback({ kind: result.code === "PROJECT_STALE" ? "stale" : "error", message: result.message });
      return;
    }
    setStatusFeedback({ kind: "success", message: "Статус сохранён" });
    router.refresh();
  });

  const submitSettings = settingsForm.handleSubmit(async (values) => {
    setSettingsFeedback(null);
    const result = await updateProjectSettingsAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, settingsForm.setError);
      setSettingsFeedback({ kind: result.code === "PROJECT_STALE" ? "stale" : "error", message: result.message });
      return;
    }
    setSettingsFeedback({ kind: "success", message: "Данные сохранены" });
    router.refresh();
  });

  return (
    <div className="space-y-3">
      <form className="flex flex-wrap items-end gap-2" onSubmit={submitStatus}>
        <label className="min-w-40 space-y-1">
          <span className="block text-xs font-medium text-slate-600">Статус</span>
          <NativeSelect className={fieldClassName} {...statusForm.register("status")}>
            {PROJECT_STATUSES.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </NativeSelect>
        </label>
        <Button className="min-h-11" disabled={statusForm.formState.isSubmitting} type="submit" variant="outline">
          {statusForm.formState.isSubmitting ? "Сохраняем…" : "Сохранить"}
        </Button>
        <FeedbackMessage feedback={statusFeedback} onRefresh={() => router.refresh()} />
      </form>
      <details className="rounded-xl border border-slate-200 bg-slate-50/60">
        <summary className="min-h-11 cursor-pointer list-none px-3 py-3 text-sm font-medium text-slate-700">
          Настройки
        </summary>
        <form className="grid gap-3 border-t border-slate-200 p-3" onSubmit={submitSettings}>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-slate-600">Название</span>
            <Input {...settingsForm.register("name")} />
            {settingsForm.formState.errors.name ? <span className="text-xs text-rose-700">{settingsForm.formState.errors.name.message}</span> : null}
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-slate-600">Пороговый профиль</span>
            <NativeSelect className={fieldClassName} {...settingsForm.register("thresholdProfileId")}>
              {options.thresholdProfiles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </NativeSelect>
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-slate-600">Кластерный профиль</span>
            <NativeSelect className={fieldClassName} {...settingsForm.register("clusterProfileId")}>
              {options.clusterProfiles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </NativeSelect>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={settingsForm.formState.isSubmitting} type="submit">
              {settingsForm.formState.isSubmitting ? "Сохраняем…" : "Сохранить настройки"}
            </Button>
            <FeedbackMessage feedback={settingsFeedback} onRefresh={() => router.refresh()} />
          </div>
        </form>
      </details>
    </div>
  );
}
