"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import {
  createThresholdProfileAction,
  updateThresholdProfileAction,
} from "../_actions/thresholds.ts";
import {
  applyFieldErrors,
  feedbackFrom,
  FormField,
  SectionCard,
  SubmitRow,
  TextInput,
  type Feedback,
} from "./platform-admin-form-primitives.tsx";
import type {
  CreateThresholdProfileInput,
  ThresholdProfileListItem,
  UpdateThresholdProfileInput,
} from "../../../modules/project-registry/contracts.ts";

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


export function ThresholdProfilesAdminForms({ items }: { items: ThresholdProfileListItem[] }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<CreateThresholdProfileInput>({
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
  const submit = form.handleSubmit(async (values) => {
    const result = await createThresholdProfileAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    setFeedback({ kind: "success", message: "Пороговый профиль создан" });
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Создать пороговый профиль" description="Platform-owned аналитический профиль с optimistic concurrency.">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormField error={form.formState.errors.slug?.message} label="Slug" required><TextInput {...form.register("slug")} /></FormField>
          <FormField error={form.formState.errors.minimumShows?.message} label="Минимум показов" required><TextInput type="number" step="1" {...form.register("minimumShows", { valueAsNumber: true })} /></FormField>
          <FormField error={form.formState.errors.maximumCtrPercent?.message} label="Maximum CTR %" required><TextInput type="number" step="any" {...form.register("maximumCtrPercent", { valueAsNumber: true })} /></FormField>
          <FormField error={form.formState.errors.maximumAveragePosition?.message} label="Maximum average position" required><TextInput type="number" step="any" {...form.register("maximumAveragePosition", { valueAsNumber: true })} /></FormField>
          <FormField error={form.formState.errors.showsDropPercent?.message} label="Shows drop %" required><TextInput type="number" step="any" {...form.register("showsDropPercent", { valueAsNumber: true })} /></FormField>
          <FormField error={form.formState.errors.clicksDropPercent?.message} label="Clicks drop %" required><TextInput type="number" step="any" {...form.register("clicksDropPercent", { valueAsNumber: true })} /></FormField>
          <FormField error={form.formState.errors.positionWorsenedDelta?.message} label="Position worsened delta" required><TextInput type="number" step="any" {...form.register("positionWorsenedDelta", { valueAsNumber: true })} /></FormField>
          <FormField error={form.formState.errors.pagesInSearchDropPercent?.message} label="Pages in search drop %" required><TextInput type="number" step="any" {...form.register("pagesInSearchDropPercent", { valueAsNumber: true })} /></FormField>
          <FormField error={form.formState.errors.organicVisitsDropPercent?.message} label="Organic visits drop %" required><TextInput type="number" step="any" {...form.register("organicVisitsDropPercent", { valueAsNumber: true })} /></FormField>
          <FormField error={form.formState.errors.goalConversionDropPercent?.message} label="Goal conversion drop %" required><TextInput type="number" step="any" {...form.register("goalConversionDropPercent", { valueAsNumber: true })} /></FormField>
          <div className="sm:col-span-2"><SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Создать пороги" onRefresh={() => router.refresh()} pendingLabel="Создаём…" /></div>
        </form>
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <ThresholdProfileEditCard item={item} key={item.id} />)}</div>
    </div>
  );
}
