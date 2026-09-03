"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type FieldValues, type Resolver, type UseFormSetError } from "react-hook-form";
import { z } from "zod";
import {
  createGoalDefinitionAction,
  createProviderConnectionAction,
  createQueryClusterProfileAction,
  createSiteAction,
  createThresholdProfileAction,
  createTrackedQuerySetAction,
  updateGoalDefinitionAction,
  updateProviderConnectionAction,
  updateQueryClusterProfileAction,
  updateSiteAction,
  updateThresholdProfileAction,
  updateTrackedQuerySetAction,
} from "../actions.ts";
import {
  AreaInput,
  applyFieldErrors,
  feedbackFrom,
  FormField,
  SectionCard,
  SelectInput,
  SubmitRow,
  TextInput,
  type Feedback,
} from "./platform-admin-form-primitives.tsx";
import {
  goalCategorySchema,
  goalDirectionSchema,
  providerSchema,
  rankingSourceSchema,
  type CreateGoalDefinitionInput,
  type CreateProviderConnectionInput,
  type CreateQueryClusterProfileInput,
  type CreateSiteInput,
  type CreateThresholdProfileInput,
  type CreateTrackedQuerySetInput,
  type GoalDefinitionListItem,
  type ProjectRegistryAdminFormOptions,
  type ProviderConnectionListItem,
  type QueryClusterProfileListItem,
  type SiteListItem,
  type ThresholdProfileListItem,
  type TrackedQuerySetListItem,
  type UpdateGoalDefinitionInput,
  type UpdateProviderConnectionInput,
  type UpdateQueryClusterProfileInput,
  type UpdateSiteInput,
  type UpdateThresholdProfileInput,
  type UpdateTrackedQuerySetInput,
} from "../../../modules/project-registry/contracts.ts";

const siteFormSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().trim().min(1),
  name: z.string().trim().min(2),
  url: z.url(),
  timezone: z.string().trim().min(1),
  enabled: z.boolean(),
});
const updateSiteFormSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  slug: z.string().trim().min(1),
  name: z.string().trim().min(2),
  url: z.url(),
  timezone: z.string().trim().min(1),
  enabled: z.boolean(),
});
const providerFormSchema = z.object({
  siteId: z.string().min(1),
  provider: providerSchema,
  externalId: z.string().trim(),
  enabled: z.boolean(),
  settingsJsonText: z.string().max(10000),
});
const updateProviderFormSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  externalId: z.string().trim(),
  enabled: z.boolean(),
  settingsJsonText: z.string().max(10000),
});
const goalFormSchema = z.object({
  projectId: z.string().min(1),
  externalGoalId: z.string().trim().min(1),
  label: z.string().trim().min(2),
  category: goalCategorySchema,
  direction: goalDirectionSchema,
  includeInSeoConversion: z.boolean(),
  siteIdsText: z.string().max(20000),
});
const updateGoalFormSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  label: z.string().trim().min(2),
  category: goalCategorySchema,
  direction: goalDirectionSchema,
  includeInSeoConversion: z.boolean(),
  siteIdsText: z.string().max(20000),
});
const trackedQueryFormSchema = z.object({
  siteId: z.string().min(1),
  source: rankingSourceSchema,
  baselineLabel: z.string().trim().min(2),
  queriesText: z.string().trim().min(1),
});
const updateTrackedQueryFormSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  source: rankingSourceSchema,
  baselineLabel: z.string().trim().min(2),
  queriesText: z.string().trim().min(1),
});
const thresholdFormSchema = z.object({
  slug: z.string().trim().min(1),
  minimumShows: z.coerce.number().int().min(0),
  maximumCtrPercent: z.coerce.number().finite(),
  maximumAveragePosition: z.coerce.number().finite(),
  showsDropPercent: z.coerce.number().finite(),
  clicksDropPercent: z.coerce.number().finite(),
  positionWorsenedDelta: z.coerce.number().finite(),
  pagesInSearchDropPercent: z.coerce.number().finite(),
  organicVisitsDropPercent: z.coerce.number().finite(),
  goalConversionDropPercent: z.coerce.number().finite(),
});
const updateThresholdFormSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  minimumShows: z.coerce.number().int().min(0),
  maximumCtrPercent: z.coerce.number().finite(),
  maximumAveragePosition: z.coerce.number().finite(),
  showsDropPercent: z.coerce.number().finite(),
  clicksDropPercent: z.coerce.number().finite(),
  positionWorsenedDelta: z.coerce.number().finite(),
  pagesInSearchDropPercent: z.coerce.number().finite(),
  organicVisitsDropPercent: z.coerce.number().finite(),
  goalConversionDropPercent: z.coerce.number().finite(),
});
const clusterFormSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(2),
  groupsJsonText: z.string().trim().min(2),
});
const updateClusterFormSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().trim().min(2),
  groupsJsonText: z.string().trim().min(2),
});

const providerOptions = providerSchema.options.map((value) => ({ value, label: value }));
const goalCategoryOptions = goalCategorySchema.options.map((value) => ({ value, label: value }));
const goalDirectionOptions = goalDirectionSchema.options.map((value) => ({ value, label: value }));
const rankingSourceOptions = rankingSourceSchema.options.map((value) => ({ value, label: value }));

function parseList(value: string) {
  return [...new Set(value.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean))];
}

function parseSettingsJson(text: string) {
  if (!text.trim()) return null;
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SETTINGS_JSON_INVALID");
  }
  if (Object.keys(parsed).some((key) => /(token|secret|password|credential|authorization|api.?key)/i.test(key))) {
    throw new Error("SETTINGS_JSON_SENSITIVE_KEY");
  }
  return parsed as Record<string, string | number | boolean | null>;
}

function applyProviderFieldErrors<TValues extends FieldValues>(
  fieldErrors: Record<string, string[]>,
  setError: UseFormSetError<TValues>,
) {
  applyFieldErrors(
    fieldErrors.settingsJson
      ? { ...fieldErrors, settingsJsonText: fieldErrors.settingsJson }
      : fieldErrors,
    setError,
  );
}

function applyGoalFieldErrors<TValues extends FieldValues>(
  fieldErrors: Record<string, string[]>,
  setError: UseFormSetError<TValues>,
) {
  applyFieldErrors(
    fieldErrors.siteIds ? { ...fieldErrors, siteIdsText: fieldErrors.siteIds } : fieldErrors,
    setError,
  );
}

function applyTrackedQueryFieldErrors<TValues extends FieldValues>(
  fieldErrors: Record<string, string[]>,
  setError: UseFormSetError<TValues>,
) {
  applyFieldErrors(
    fieldErrors.queries ? { ...fieldErrors, queriesText: fieldErrors.queries } : fieldErrors,
    setError,
  );
}

function applyClusterFieldErrors<TValues extends FieldValues>(
  fieldErrors: Record<string, string[]>,
  setError: UseFormSetError<TValues>,
) {
  applyFieldErrors(
    fieldErrors.groups ? { ...fieldErrors, groupsJsonText: fieldErrors.groups } : fieldErrors,
    setError,
  );
}

function parseGroupsJson(text: string) {
  return JSON.parse(text) as CreateQueryClusterProfileInput["groups"];
}

function SiteEditCard({ item }: { item: SiteListItem }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<z.infer<typeof updateSiteFormSchema>>({
    resolver: zodResolver(updateSiteFormSchema) as Resolver<z.infer<typeof updateSiteFormSchema>>,
    defaultValues: {
      id: item.id,
      version: item.version,
      slug: item.slug,
      name: item.name,
      url: item.url,
      timezone: item.timezone,
      enabled: item.enabled,
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const result = await updateSiteAction(values satisfies UpdateSiteInput);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    setFeedback({ kind: "success", message: "Сайт обновлён" });
    router.refresh();
  });

  return (
    <SectionCard title={item.name} description={`${item.projectName} · ${item.url}`}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <input type="hidden" {...form.register("id")} />
        <input type="hidden" {...form.register("version", { valueAsNumber: true })} />
        <FormField error={form.formState.errors.name?.message} label="Название" required>
          <TextInput {...form.register("name")} />
        </FormField>
        <FormField error={form.formState.errors.slug?.message} label="Slug" required>
          <TextInput {...form.register("slug")} />
        </FormField>
        <FormField error={form.formState.errors.url?.message} label="URL" required>
          <TextInput {...form.register("url")} />
        </FormField>
        <FormField error={form.formState.errors.timezone?.message} label="Timezone" required>
          <TextInput {...form.register("timezone")} />
        </FormField>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 sm:col-span-2">
          <input type="checkbox" className="size-4 accent-slate-900" {...form.register("enabled")} />
          Сбор данных включён
        </label>
        <div className="sm:col-span-2">
          <SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Сохранить сайт" onRefresh={() => router.refresh()} pendingLabel="Сохраняем…" />
        </div>
      </form>
    </SectionCard>
  );
}

export function SitesAdminForms({ items, options }: { items: SiteListItem[]; options: ProjectRegistryAdminFormOptions }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<CreateSiteInput>({
    resolver: zodResolver(siteFormSchema) as Resolver<CreateSiteInput>,
    defaultValues: {
      projectId: options.projects[0]?.id ?? "",
      slug: "",
      name: "",
      url: "https://",
      timezone: "Europe/Moscow",
      enabled: true,
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const result = await createSiteAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    setFeedback({ kind: "success", message: "Сайт создан" });
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Создать сайт" description="Project owner и organization scope выводятся из выбранного проекта.">
        <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <FormField error={form.formState.errors.projectId?.message} label="Проект" required>
            <SelectInput options={options.projects.map((option) => ({ value: option.id, label: option.label }))} {...form.register("projectId")} />
          </FormField>
          <FormField error={form.formState.errors.name?.message} label="Название" required>
            <TextInput {...form.register("name")} />
          </FormField>
          <FormField error={form.formState.errors.slug?.message} label="Slug" required>
            <TextInput {...form.register("slug")} />
          </FormField>
          <FormField error={form.formState.errors.url?.message} label="URL" required>
            <TextInput {...form.register("url")} />
          </FormField>
          <FormField error={form.formState.errors.timezone?.message} label="Timezone" required>
            <TextInput {...form.register("timezone")} />
          </FormField>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 xl:self-end">
            <input type="checkbox" className="size-4 accent-slate-900" {...form.register("enabled")} />
            Сбор данных включён
          </label>
          <div className="sm:col-span-2 xl:col-span-3">
            <SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Создать сайт" onRefresh={() => router.refresh()} pendingLabel="Создаём…" />
          </div>
        </form>
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <SiteEditCard item={item} key={item.id} />)}</div>
    </div>
  );
}

function ProviderConnectionEditCard({ item }: { item: ProviderConnectionListItem }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<z.infer<typeof updateProviderFormSchema>>({
    resolver: zodResolver(updateProviderFormSchema) as Resolver<z.infer<typeof updateProviderFormSchema>>,
    defaultValues: {
      id: item.id,
      version: item.version,
      externalId: item.externalId ?? "",
      enabled: item.enabled,
      settingsJsonText: item.settingsJson ? JSON.stringify(item.settingsJson, null, 2) : "{}",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await updateProviderConnectionAction({
        id: values.id,
        version: values.version,
        externalId: values.externalId.trim() || null,
        enabled: values.enabled,
        settingsJson: parseSettingsJson(values.settingsJsonText),
      } satisfies UpdateProviderConnectionInput);
      if (!result.ok) {
        applyProviderFieldErrors(result.fieldErrors, form.setError);
        setFeedback(feedbackFrom(result));
        return;
      }
      setFeedback({ kind: "success", message: "Подключение обновлено" });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error && error.message === "SETTINGS_JSON_SENSITIVE_KEY"
        ? "Разрешён только плоский nonsecret JSON без token, password, secret и API key"
        : "Введите валидный JSON-объект";
      form.setError("settingsJsonText", { message });
      setFeedback({ kind: "error", message });
    }
  });

  return (
    <SectionCard title={`${item.siteName} · ${item.provider}`} description={`${item.projectName} · ${item.siteSlug}`}>
      <form className="grid gap-4" onSubmit={submit}>
        <input type="hidden" {...form.register("id")} />
        <input type="hidden" {...form.register("version", { valueAsNumber: true })} />
        <FormField error={form.formState.errors.externalId?.message} label="External ID">
          <TextInput {...form.register("externalId")} />
        </FormField>
        <FormField error={form.formState.errors.settingsJsonText?.message} helper="Только плоский nonsecret JSON-объект." label="Текущие настройки JSON" required>
          <AreaInput rows={6} {...form.register("settingsJsonText")} />
        </FormField>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800">
          <input type="checkbox" className="size-4 accent-slate-900" {...form.register("enabled")} />
          Источник включён
        </label>
        <SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Сохранить подключение" onRefresh={() => router.refresh()} pendingLabel="Сохраняем…" />
      </form>
    </SectionCard>
  );
}

export function ProviderConnectionsAdminForms({ items, options }: { items: ProviderConnectionListItem[]; options: ProjectRegistryAdminFormOptions }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<z.infer<typeof providerFormSchema>>({
    resolver: zodResolver(providerFormSchema) as Resolver<z.infer<typeof providerFormSchema>>,
    defaultValues: {
      siteId: options.sites[0]?.id ?? "",
      provider: "YANDEX_WEBMASTER",
      externalId: "",
      enabled: true,
      settingsJsonText: "{}",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await createProviderConnectionAction({
        siteId: values.siteId,
        provider: values.provider,
        externalId: values.externalId.trim() || null,
        enabled: values.enabled,
        settingsJson: parseSettingsJson(values.settingsJsonText),
      } satisfies CreateProviderConnectionInput);
      if (!result.ok) {
        applyProviderFieldErrors(result.fieldErrors, form.setError);
        setFeedback(feedbackFrom(result));
        return;
      }
      setFeedback({ kind: "success", message: "Подключение создано" });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error && error.message === "SETTINGS_JSON_SENSITIVE_KEY"
        ? "Разрешён только плоский nonsecret JSON без token, password, secret и API key"
        : "Введите валидный JSON-объект";
      form.setError("settingsJsonText", { message });
      setFeedback({ kind: "error", message });
    }
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Создать подключение" description="Секреты сюда не вводятся. Только external mapping и nonsecret JSON.">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormField error={form.formState.errors.siteId?.message} label="Сайт" required>
            <SelectInput options={options.sites.map((option) => ({ value: option.id, label: option.label }))} {...form.register("siteId")} />
          </FormField>
          <FormField error={form.formState.errors.provider?.message} label="Источник" required>
            <SelectInput options={providerOptions} {...form.register("provider")} />
          </FormField>
          <FormField error={form.formState.errors.externalId?.message} label="External ID">
            <TextInput {...form.register("externalId")} />
          </FormField>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 xl:self-end">
            <input type="checkbox" className="size-4 accent-slate-900" {...form.register("enabled")} />
            Источник включён
          </label>
          <div className="sm:col-span-2">
            <FormField error={form.formState.errors.settingsJsonText?.message} helper="Только плоский nonsecret JSON-объект." label="Nonsecret settings JSON" required>
              <AreaInput rows={6} {...form.register("settingsJsonText")} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Создать подключение" onRefresh={() => router.refresh()} pendingLabel="Создаём…" />
          </div>
        </form>
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <ProviderConnectionEditCard item={item} key={item.id} />)}</div>
    </div>
  );
}

function GoalDefinitionEditCard({ item }: { item: GoalDefinitionListItem }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<z.infer<typeof updateGoalFormSchema>>({
    resolver: zodResolver(updateGoalFormSchema) as Resolver<z.infer<typeof updateGoalFormSchema>>,
    defaultValues: {
      id: item.id,
      version: item.version,
      label: item.label,
      category: item.category,
      direction: item.direction,
      includeInSeoConversion: item.includeInSeoConversion,
      siteIdsText: item.siteIds.join("\n"),
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const result = await updateGoalDefinitionAction({
      id: values.id,
      version: values.version,
      label: values.label,
      category: values.category,
      direction: values.direction,
      includeInSeoConversion: values.includeInSeoConversion,
      siteIds: parseList(values.siteIdsText),
    } satisfies UpdateGoalDefinitionInput);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    setFeedback({ kind: "success", message: "Цель обновлена" });
    router.refresh();
  });

  return (
    <SectionCard title={item.label} description={`${item.projectName} · ${item.externalGoalId}`}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <input type="hidden" {...form.register("id")} />
        <input type="hidden" {...form.register("version", { valueAsNumber: true })} />
        <FormField error={form.formState.errors.label?.message} label="Название" required>
          <TextInput {...form.register("label")} />
        </FormField>
        <FormField error={form.formState.errors.category?.message} label="Категория" required>
          <SelectInput options={goalCategoryOptions} {...form.register("category")} />
        </FormField>
        <FormField error={form.formState.errors.direction?.message} label="Направление" required>
          <SelectInput options={goalDirectionOptions} {...form.register("direction")} />
        </FormField>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 xl:self-end">
          <input type="checkbox" className="size-4 accent-slate-900" {...form.register("includeInSeoConversion")} />
          Учитывать в SEO-конверсии
        </label>
        <div className="sm:col-span-2">
          <FormField error={form.formState.errors.siteIdsText?.message} helper="Один site ID на строку или через запятую." label="Site IDs">
            <AreaInput rows={5} {...form.register("siteIdsText")} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Сохранить цель" onRefresh={() => router.refresh()} pendingLabel="Сохраняем…" />
        </div>
      </form>
    </SectionCard>
  );
}

export function GoalDefinitionsAdminForms({ items, options }: { items: GoalDefinitionListItem[]; options: ProjectRegistryAdminFormOptions }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<z.infer<typeof goalFormSchema>>({
    resolver: zodResolver(goalFormSchema) as Resolver<z.infer<typeof goalFormSchema>>,
    defaultValues: {
      projectId: options.projects[0]?.id ?? "",
      externalGoalId: "",
      label: "",
      category: "LEAD_SUBMIT",
      direction: "PRIMARY",
      includeInSeoConversion: true,
      siteIdsText: "",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const result = await createGoalDefinitionAction({
      projectId: values.projectId,
      externalGoalId: values.externalGoalId,
      label: values.label,
      category: values.category,
      direction: values.direction,
      includeInSeoConversion: values.includeInSeoConversion,
      siteIds: parseList(values.siteIdsText),
    } satisfies CreateGoalDefinitionInput);
    if (!result.ok) {
      applyGoalFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    setFeedback({ kind: "success", message: "Цель создана" });
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Создать цель" description="Project owner и site scopes проверяются на сервере.">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormField error={form.formState.errors.projectId?.message} label="Проект" required>
            <SelectInput options={options.projects.map((option) => ({ value: option.id, label: option.label }))} {...form.register("projectId")} />
          </FormField>
          <FormField error={form.formState.errors.externalGoalId?.message} label="External goal ID" required>
            <TextInput {...form.register("externalGoalId")} />
          </FormField>
          <FormField error={form.formState.errors.label?.message} label="Название" required>
            <TextInput {...form.register("label")} />
          </FormField>
          <FormField error={form.formState.errors.category?.message} label="Категория" required>
            <SelectInput options={goalCategoryOptions} {...form.register("category")} />
          </FormField>
          <FormField error={form.formState.errors.direction?.message} label="Направление" required>
            <SelectInput options={goalDirectionOptions} {...form.register("direction")} />
          </FormField>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 xl:self-end">
            <input type="checkbox" className="size-4 accent-slate-900" {...form.register("includeInSeoConversion")} />
            Учитывать в SEO-конверсии
          </label>
          <div className="sm:col-span-2">
            <FormField error={form.formState.errors.siteIdsText?.message} helper="Один site ID на строку или через запятую." label="Site IDs">
              <AreaInput rows={5} {...form.register("siteIdsText")} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Создать цель" onRefresh={() => router.refresh()} pendingLabel="Создаём…" />
          </div>
        </form>
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <GoalDefinitionEditCard item={item} key={item.id} />)}</div>
    </div>
  );
}

function TrackedQuerySetEditCard({ item }: { item: TrackedQuerySetListItem }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<z.infer<typeof updateTrackedQueryFormSchema>>({
    resolver: zodResolver(updateTrackedQueryFormSchema) as Resolver<z.infer<typeof updateTrackedQueryFormSchema>>,
    defaultValues: {
      id: item.id,
      version: item.version,
      source: item.source,
      baselineLabel: item.baselineLabel,
      queriesText: item.queries.join("\n"),
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const result = await updateTrackedQuerySetAction({
      id: values.id,
      version: values.version,
      source: values.source,
      baselineLabel: values.baselineLabel,
      queries: parseList(values.queriesText),
    } satisfies UpdateTrackedQuerySetInput);
    if (!result.ok) {
      applyTrackedQueryFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    setFeedback({ kind: "success", message: "Набор запросов обновлён" });
    router.refresh();
  });

  return (
    <SectionCard title={item.siteName} description={`${item.projectName} · ${item.expectedCount} запросов`}>
      <form className="grid gap-4" onSubmit={submit}>
        <input type="hidden" {...form.register("id")} />
        <input type="hidden" {...form.register("version", { valueAsNumber: true })} />
        <FormField error={form.formState.errors.source?.message} label="Источник baseline" required>
          <SelectInput options={rankingSourceOptions} {...form.register("source")} />
        </FormField>
        <FormField error={form.formState.errors.baselineLabel?.message} label="Baseline label" required>
          <TextInput {...form.register("baselineLabel")} />
        </FormField>
        <FormField error={form.formState.errors.queriesText?.message} helper="Один запрос на строку." label="Запросы" required>
          <AreaInput rows={7} {...form.register("queriesText")} />
        </FormField>
        <SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Сохранить набор" onRefresh={() => router.refresh()} pendingLabel="Сохраняем…" />
      </form>
    </SectionCard>
  );
}

export function TrackedQuerySetsAdminForms({ items, options }: { items: TrackedQuerySetListItem[]; options: ProjectRegistryAdminFormOptions }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<z.infer<typeof trackedQueryFormSchema>>({
    resolver: zodResolver(trackedQueryFormSchema) as Resolver<z.infer<typeof trackedQueryFormSchema>>,
    defaultValues: {
      siteId: options.sites[0]?.id ?? "",
      source: "OWNER_PROVIDED",
      baselineLabel: "",
      queriesText: "",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const result = await createTrackedQuerySetAction({
      siteId: values.siteId,
      source: values.source,
      baselineLabel: values.baselineLabel,
      queries: parseList(values.queriesText),
    } satisfies CreateTrackedQuerySetInput);
    if (!result.ok) {
      applyTrackedQueryFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    setFeedback({ kind: "success", message: "Набор запросов создан" });
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Создать набор запросов" description="История запросов сохраняется через enabled lifecycle, а не удалением.">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormField error={form.formState.errors.siteId?.message} label="Сайт" required>
            <SelectInput options={options.sites.map((option) => ({ value: option.id, label: option.label }))} {...form.register("siteId")} />
          </FormField>
          <FormField error={form.formState.errors.source?.message} label="Источник baseline" required>
            <SelectInput options={rankingSourceOptions} {...form.register("source")} />
          </FormField>
          <FormField error={form.formState.errors.baselineLabel?.message} label="Baseline label" required>
            <TextInput {...form.register("baselineLabel")} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField error={form.formState.errors.queriesText?.message} helper="Один запрос на строку." label="Запросы" required>
              <AreaInput rows={7} {...form.register("queriesText")} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Создать набор" onRefresh={() => router.refresh()} pendingLabel="Создаём…" />
          </div>
        </form>
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <TrackedQuerySetEditCard item={item} key={item.id} />)}</div>
    </div>
  );
}

function ThresholdProfileEditCard({ item }: { item: ThresholdProfileListItem }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<z.infer<typeof updateThresholdFormSchema>>({
    resolver: zodResolver(updateThresholdFormSchema) as Resolver<z.infer<typeof updateThresholdFormSchema>>,
    defaultValues: {
      id: item.id,
      version: item.version,
      minimumShows: item.minimumShows,
      maximumCtrPercent: item.maximumCtrPercent,
      maximumAveragePosition: item.maximumAveragePosition,
      showsDropPercent: item.showsDropPercent,
      clicksDropPercent: item.clicksDropPercent,
      positionWorsenedDelta: item.positionWorsenedDelta,
      pagesInSearchDropPercent: item.pagesInSearchDropPercent,
      organicVisitsDropPercent: item.organicVisitsDropPercent,
      goalConversionDropPercent: item.goalConversionDropPercent,
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const result = await updateThresholdProfileAction(values satisfies UpdateThresholdProfileInput);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    setFeedback({ kind: "success", message: "Пороговый профиль обновлён" });
    router.refresh();
  });

  return (
    <SectionCard title={item.slug} description="Пороговый профиль аналитических правил.">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <input type="hidden" {...form.register("id")} />
        <input type="hidden" {...form.register("version", { valueAsNumber: true })} />
        <FormField error={form.formState.errors.minimumShows?.message} label="Минимум показов" required><TextInput type="number" step="1" {...form.register("minimumShows", { valueAsNumber: true })} /></FormField>
        <FormField error={form.formState.errors.maximumCtrPercent?.message} label="Maximum CTR %" required><TextInput type="number" step="any" {...form.register("maximumCtrPercent", { valueAsNumber: true })} /></FormField>
        <FormField error={form.formState.errors.maximumAveragePosition?.message} label="Maximum average position" required><TextInput type="number" step="any" {...form.register("maximumAveragePosition", { valueAsNumber: true })} /></FormField>
        <FormField error={form.formState.errors.showsDropPercent?.message} label="Shows drop %" required><TextInput type="number" step="any" {...form.register("showsDropPercent", { valueAsNumber: true })} /></FormField>
        <FormField error={form.formState.errors.clicksDropPercent?.message} label="Clicks drop %" required><TextInput type="number" step="any" {...form.register("clicksDropPercent", { valueAsNumber: true })} /></FormField>
        <FormField error={form.formState.errors.positionWorsenedDelta?.message} label="Position worsened delta" required><TextInput type="number" step="any" {...form.register("positionWorsenedDelta", { valueAsNumber: true })} /></FormField>
        <FormField error={form.formState.errors.pagesInSearchDropPercent?.message} label="Pages in search drop %" required><TextInput type="number" step="any" {...form.register("pagesInSearchDropPercent", { valueAsNumber: true })} /></FormField>
        <FormField error={form.formState.errors.organicVisitsDropPercent?.message} label="Organic visits drop %" required><TextInput type="number" step="any" {...form.register("organicVisitsDropPercent", { valueAsNumber: true })} /></FormField>
        <FormField error={form.formState.errors.goalConversionDropPercent?.message} label="Goal conversion drop %" required><TextInput type="number" step="any" {...form.register("goalConversionDropPercent", { valueAsNumber: true })} /></FormField>
        <div className="sm:col-span-2"><SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Сохранить пороги" onRefresh={() => router.refresh()} pendingLabel="Сохраняем…" /></div>
      </form>
    </SectionCard>
  );
}

function QueryClusterProfileEditCard({ item }: { item: QueryClusterProfileListItem }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<z.infer<typeof updateClusterFormSchema>>({
    resolver: zodResolver(updateClusterFormSchema) as Resolver<z.infer<typeof updateClusterFormSchema>>,
    defaultValues: {
      id: item.id,
      version: item.version,
      name: item.name,
      groupsJsonText: JSON.stringify(item.groups, null, 2),
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await updateQueryClusterProfileAction({
        id: values.id,
        version: values.version,
        name: values.name,
        groups: parseGroupsJson(values.groupsJsonText),
      } satisfies UpdateQueryClusterProfileInput);
      if (!result.ok) {
        applyClusterFieldErrors(result.fieldErrors, form.setError);
        setFeedback(feedbackFrom(result));
        return;
      }
      setFeedback({ kind: "success", message: "Кластерный профиль обновлён" });
      router.refresh();
    } catch {
      form.setError("groupsJsonText", { message: "Введите валидный JSON-массив групп" });
      setFeedback({ kind: "error", message: "Введите валидный JSON-массив групп" });
    }
  });

  return (
    <SectionCard title={item.name} description={item.slug}>
      <form className="grid gap-4" onSubmit={submit}>
        <input type="hidden" {...form.register("id")} />
        <input type="hidden" {...form.register("version", { valueAsNumber: true })} />
        <FormField error={form.formState.errors.name?.message} label="Название" required>
          <TextInput {...form.register("name")} />
        </FormField>
        <FormField error={form.formState.errors.groupsJsonText?.message} helper="Массив объектов: slug, label, order, brandTerms, terms." label="Группы JSON" required>
          <AreaInput rows={8} {...form.register("groupsJsonText")} />
        </FormField>
        <SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Сохранить кластеры" onRefresh={() => router.refresh()} pendingLabel="Сохраняем…" />
      </form>
    </SectionCard>
  );
}

export function ProfilesAdminForms({ thresholds, clusters }: { thresholds: ThresholdProfileListItem[]; clusters: QueryClusterProfileListItem[] }) {
  const router = useRouter();
  const [thresholdFeedback, setThresholdFeedback] = useState<Feedback>(null);
  const [clusterFeedback, setClusterFeedback] = useState<Feedback>(null);
  const thresholdForm = useForm<CreateThresholdProfileInput>({
    resolver: zodResolver(thresholdFormSchema) as Resolver<CreateThresholdProfileInput>,
    defaultValues: {
      slug: "",
      minimumShows: 10,
      maximumCtrPercent: 0,
      maximumAveragePosition: 0,
      showsDropPercent: 0,
      clicksDropPercent: 0,
      positionWorsenedDelta: 0,
      pagesInSearchDropPercent: 0,
      organicVisitsDropPercent: 0,
      goalConversionDropPercent: 0,
    },
  });
  const clusterForm = useForm<z.infer<typeof clusterFormSchema>>({
    resolver: zodResolver(clusterFormSchema) as Resolver<z.infer<typeof clusterFormSchema>>,
    defaultValues: { slug: "", name: "", groupsJsonText: "[]" },
  });

  const submitThreshold = thresholdForm.handleSubmit(async (values) => {
    const result = await createThresholdProfileAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, thresholdForm.setError);
      setThresholdFeedback(feedbackFrom(result));
      return;
    }
    setThresholdFeedback({ kind: "success", message: "Пороговый профиль создан" });
    router.refresh();
  });

  const submitCluster = clusterForm.handleSubmit(async (values) => {
    try {
      const result = await createQueryClusterProfileAction({
        slug: values.slug,
        name: values.name,
        groups: parseGroupsJson(values.groupsJsonText),
      } satisfies CreateQueryClusterProfileInput);
      if (!result.ok) {
        applyFieldErrors(result.fieldErrors, clusterForm.setError);
        setClusterFeedback(feedbackFrom(result));
        return;
      }
      setClusterFeedback({ kind: "success", message: "Кластерный профиль создан" });
      router.refresh();
    } catch {
      clusterForm.setError("groupsJsonText", { message: "Введите валидный JSON-массив групп" });
      setClusterFeedback({ kind: "error", message: "Введите валидный JSON-массив групп" });
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Создать пороговый профиль" description="Platform-owned аналитический профиль с optimistic concurrency.">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitThreshold}>
            <FormField error={thresholdForm.formState.errors.slug?.message} label="Slug" required><TextInput {...thresholdForm.register("slug")} /></FormField>
            <FormField error={thresholdForm.formState.errors.minimumShows?.message} label="Минимум показов" required><TextInput type="number" step="1" {...thresholdForm.register("minimumShows", { valueAsNumber: true })} /></FormField>
            <FormField error={thresholdForm.formState.errors.maximumCtrPercent?.message} label="Maximum CTR %" required><TextInput type="number" step="any" {...thresholdForm.register("maximumCtrPercent", { valueAsNumber: true })} /></FormField>
            <FormField error={thresholdForm.formState.errors.maximumAveragePosition?.message} label="Maximum average position" required><TextInput type="number" step="any" {...thresholdForm.register("maximumAveragePosition", { valueAsNumber: true })} /></FormField>
            <FormField error={thresholdForm.formState.errors.showsDropPercent?.message} label="Shows drop %" required><TextInput type="number" step="any" {...thresholdForm.register("showsDropPercent", { valueAsNumber: true })} /></FormField>
            <FormField error={thresholdForm.formState.errors.clicksDropPercent?.message} label="Clicks drop %" required><TextInput type="number" step="any" {...thresholdForm.register("clicksDropPercent", { valueAsNumber: true })} /></FormField>
            <FormField error={thresholdForm.formState.errors.positionWorsenedDelta?.message} label="Position worsened delta" required><TextInput type="number" step="any" {...thresholdForm.register("positionWorsenedDelta", { valueAsNumber: true })} /></FormField>
            <FormField error={thresholdForm.formState.errors.pagesInSearchDropPercent?.message} label="Pages in search drop %" required><TextInput type="number" step="any" {...thresholdForm.register("pagesInSearchDropPercent", { valueAsNumber: true })} /></FormField>
            <FormField error={thresholdForm.formState.errors.organicVisitsDropPercent?.message} label="Organic visits drop %" required><TextInput type="number" step="any" {...thresholdForm.register("organicVisitsDropPercent", { valueAsNumber: true })} /></FormField>
            <FormField error={thresholdForm.formState.errors.goalConversionDropPercent?.message} label="Goal conversion drop %" required><TextInput type="number" step="any" {...thresholdForm.register("goalConversionDropPercent", { valueAsNumber: true })} /></FormField>
            <div className="sm:col-span-2"><SubmitRow busy={thresholdForm.formState.isSubmitting} feedback={thresholdFeedback} label="Создать пороги" onRefresh={() => router.refresh()} pendingLabel="Создаём…" /></div>
          </form>
        </SectionCard>
        <SectionCard title="Создать кластерный профиль" description="Полная замена групп по validated JSON-массиву.">
          <form className="grid gap-4" onSubmit={submitCluster}>
            <FormField error={clusterForm.formState.errors.slug?.message} label="Slug" required><TextInput {...clusterForm.register("slug")} /></FormField>
            <FormField error={clusterForm.formState.errors.name?.message} label="Название" required><TextInput {...clusterForm.register("name")} /></FormField>
            <FormField error={clusterForm.formState.errors.groupsJsonText?.message} helper="Массив объектов: slug, label, order, brandTerms, terms." label="Группы JSON" required><AreaInput rows={8} {...clusterForm.register("groupsJsonText")} /></FormField>
            <SubmitRow busy={clusterForm.formState.isSubmitting} feedback={clusterFeedback} label="Создать кластеры" onRefresh={() => router.refresh()} pendingLabel="Создаём…" />
          </form>
        </SectionCard>
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">{thresholds.map((item) => <ThresholdProfileEditCard item={item} key={item.id} />)}</div>
        <div className="grid gap-4 xl:grid-cols-2">{clusters.map((item) => <QueryClusterProfileEditCard item={item} key={item.id} />)}</div>
      </div>
    </div>
  );
}
