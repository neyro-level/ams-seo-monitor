export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "../../../components/dashboard/PageHeader.tsx";
import { SectionCard } from "../../../components/dashboard/SectionCard.tsx";
import { StatePanel } from "../../../components/states/StatePanel.tsx";
import { StatusBadge, type StatusTone } from "../../../components/states/StatusBadge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { Input, Textarea } from "../../../components/ui/input.tsx";
import { getCurrentPrincipalState } from "../../../modules/identity-access/server.ts";
import { createResearchCabinetService } from "../../../modules/research/server.ts";
import { createToolsWorkspaceService } from "../../../modules/tools-workspace/server.ts";
import { createResearchAction } from "./actions.ts";
import { WorkspacePicker } from "./WorkspacePicker.tsx";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const tone: Record<string, StatusTone> = { DRAFT: "neutral", READY: "info", RUNNING: "warning", SUCCEEDED: "success", FAILED: "destructive" };
const label: Record<string, string> = { DRAFT: "Черновик", READY: "Готово", RUNNING: "Выполняется", SUCCEEDED: "Завершено", FAILED: "Ошибка" };

export default async function ResearchPage({ searchParams }: { searchParams: SearchParams }) {
  const state = await getCurrentPrincipalState();
  if (!state) redirect("/?login=1");
  const principal = state.principal;
  if (principal.kind === "api-client" || principal.kind === "job") notFound();
  const options = await createToolsWorkspaceService(principal.userId).listProjectOptions(principal);
  if (!options.length) {
    if (principal.kind !== "platform-admin") notFound();
    return <div className="space-y-6"><PageHeader title="Исследования" description="Исследования по внутренним организациям и проектам." /><StatePanel state="empty" title="Нет проектов Инструментов" description="Создайте организацию и проект, затем выдайте явный доступ к проекту." /></div>;
  }
  const raw = await searchParams;
  const organizationId = first(raw.organizationId) ?? options[0]!.organizationId;
  const projectId = first(raw.projectId) ?? options.find((item) => item.organizationId === organizationId)?.id;
  const selected = options.find((item) => item.organizationId === organizationId && item.id === projectId);
  if (!selected) notFound();
  if (!first(raw.organizationId) || !first(raw.projectId)) redirect(`/tools/research/?organizationId=${encodeURIComponent(selected.organizationId)}&projectId=${encodeURIComponent(selected.id)}`);
  const records = await createResearchCabinetService(principal).list(principal, selected.organizationId, selected.id);

  return <div className="space-y-6">
    <PageHeader title="Исследования" description="История поисков и конкурентных исследований внутри выбранного проекта." />
    <WorkspacePicker options={options} organizationId={selected.organizationId} projectId={selected.id} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 space-y-3" aria-label="Список исследований">
        {records.length ? records.map((record) => <Link key={record.id} href={`/tools/research/${record.id}/?organizationId=${encodeURIComponent(record.organizationId)}&projectId=${encodeURIComponent(record.projectId)}`} className="flex min-w-0 items-center justify-between gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--ring)]">
          <span className="min-w-0"><span className="block truncate font-semibold text-app-foreground">{record.title}</span><span className="mt-1 block text-sm text-app-secondary">{record.queries.length} запросов · {new Date(record.updatedAt).toLocaleDateString("ru-RU")}</span></span>
          <StatusBadge label={label[record.status] ?? record.status} tone={tone[record.status] ?? "neutral"} />
        </Link>) : <StatePanel state="empty" title="Исследований пока нет" description="Создайте первый черновик для выбранного проекта." />}
      </section>
      <SectionCard title="Новое исследование" note={`${selected.organizationName} · ${selected.name}`}>
        <form action={createResearchAction} className="space-y-4">
          <input type="hidden" name="organizationId" value={selected.organizationId} /><input type="hidden" name="projectId" value={selected.id} />
          <label className="block space-y-2 text-sm font-medium"><span>Название</span><Input name="title" required minLength={2} maxLength={180} /></label>
          <label className="block space-y-2 text-sm font-medium"><span>Задача</span><Textarea name="brief" maxLength={5000} /></label>
          <label className="block space-y-2 text-sm font-medium"><span>Поисковые запросы</span><Textarea name="queries" required maxLength={10000} /></label>
          <Button type="submit" className="w-full"><Plus aria-hidden />Создать</Button>
        </form>
      </SectionCard>
    </div>
  </div>;
}
