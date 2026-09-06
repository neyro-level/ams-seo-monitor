"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver, type FieldValues, type UseFormSetError } from "react-hook-form";
import { z } from "zod";
import {
  createProviderConnectionAction,
  updateProviderConnectionAction,
} from "../_actions/providers.ts";
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
  providerSchema,
  type CreateProviderConnectionInput,
  type ProjectRegistryAdminFormOptions,
  type ProviderConnectionListItem,
  type UpdateProviderConnectionInput,
} from "../../../modules/project-registry/contracts.ts";

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
const providerOptions = providerSchema.options.map((value) => ({ value, label: value }));
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

