"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../../components/ui/button.tsx";
import { Card, CardContent, CardHeader } from "../../../components/ui/card.tsx";
import { Input, Textarea } from "../../../components/ui/input.tsx";
import type { AdminFormDefinition } from "../../../modules/admin-cms/presentation.ts";
import { executeAdminCommand, type AdminCommandResult } from "../actions.ts";

type AdminFormValues = Record<string, string | number | boolean>;

function fieldSchema(field: AdminFormDefinition["fields"][number]) {
  if (field.type === "checkbox") return z.boolean();
  if (field.type === "number") return field.required ? z.coerce.number().finite() : z.union([z.literal(""), z.coerce.number().finite()]);
  const base = z.string().trim();
  return field.required ? base.min(1, `Заполните поле «${field.label}»`) : base;
}

export function AdminCommandForm({ form }: { form: AdminFormDefinition }) {
  const schema = z.object(Object.fromEntries(form.fields.map((field) => [field.name, fieldSchema(field)])));
  const defaultValues = Object.fromEntries(
    form.fields.map((field) => [field.name, field.defaultValue ?? (field.type === "checkbox" ? false : "")]),
  ) as AdminFormValues;
  const [result, setResult] = useState<AdminCommandResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminFormValues>({
    resolver: zodResolver(schema) as Resolver<AdminFormValues>,
    defaultValues,
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    setResult(await executeAdminCommand(form.command, values));
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-slate-950">{form.title}</h2>
        <p className="text-sm leading-6 text-slate-600">{form.description}</p>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          {form.fields.map((field) => {
            const error = errors[field.name]?.message;
            if (field.type === "checkbox") {
              return (
                <label key={field.name} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800">
                  <input type="checkbox" className="size-4 accent-slate-900" {...register(field.name)} />
                  {field.label}
                </label>
              );
            }

            return (
              <label key={field.name} className={field.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                <span className="block text-sm font-medium text-slate-800">
                  {field.label}
                  {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
                </span>
                {field.type === "select" ? (
                  <select
                    className="min-h-11 w-full rounded-xl border border-[var(--crm-border-strong)] bg-white px-3 pr-12 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                    {...register(field.name)}
                  >
                    <option value="">Выберите</option>
                    {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : field.type === "textarea" ? (
                  <Textarea placeholder={field.placeholder} {...register(field.name)} />
                ) : (
                  <Input type={field.type} step={field.type === "number" ? "any" : undefined} placeholder={field.placeholder} {...register(field.name)} />
                )}
                {field.helper ? <span className="block text-xs leading-5 text-slate-500">{field.helper}</span> : null}
                {error ? <span className="block text-xs font-medium text-rose-700">{String(error)}</span> : null}
              </label>
            );
          })}
          <div className="space-y-3 sm:col-span-2">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Сохраняем…" : form.submitLabel}
            </Button>
            {result ? (
              <p className={result.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"} role="status">
                {result.message}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
