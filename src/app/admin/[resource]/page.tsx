export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { KpiCard } from "../../../components/dashboard/KpiCard";
import { PageHeader } from "../../../components/dashboard/PageHeader";
import { AppShell } from "../../../components/shell/AppShell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { getAdminCmsService } from "../../../infrastructure/service-container";
import {
  getAdminResourceDefinition,
  isAdminResourceKey,
  type AdminListQuery,
} from "../../../modules/admin-cms";
import {
  AdminRefineProvider,
  getAdminForms,
} from "../../../modules/admin-cms/presentation";
import { hasPermission } from "../../../modules/identity-access";
import { getCurrentActorContext } from "../../../modules/identity-access/server";
import { AdminCommandForm } from "../_components/AdminCommandForm";
import { AdminResourceNav } from "../_components/AdminResourceNav";

type AdminResourcePageProps = {
  params: Promise<{ resource: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(50).default(20),
  q: z.string().trim().max(160).default(""),
  sort: z.enum(["name", "status", "createdAt", "updatedAt"]).default("updatedAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(resource: string, query: AdminListQuery, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(query.pageSize),
    sort: query.sort,
    direction: query.direction,
  });
  if (query.search) params.set("q", query.search);
  return `/admin/${resource}/?${params.toString()}`;
}

export default async function AdminResourcePageRoute({ params, searchParams }: AdminResourcePageProps) {
  const actor = await getCurrentActorContext();
  if (!actor) redirect("/?login=1");
  if (!hasPermission(actor, "platform:manage")) redirect("/dashboard/");

  const { resource } = await params;
  if (!isAdminResourceKey(resource)) notFound();
  const rawQuery = await searchParams;
  const parsedQuery = querySchema.parse({
    page: first(rawQuery.page),
    pageSize: first(rawQuery.pageSize),
    q: first(rawQuery.q),
    sort: first(rawQuery.sort),
    direction: first(rawQuery.direction),
  });
  const query: AdminListQuery = {
    page: parsedQuery.page,
    pageSize: parsedQuery.pageSize,
    search: parsedQuery.q,
    sort: parsedQuery.sort,
    direction: parsedQuery.direction,
  };
  const admin = getAdminCmsService();
  const [summary, options, resourcePage] = await Promise.all([
    admin.getDashboardSummary(actor),
    admin.getFormOptions(actor),
    admin.listResource(actor, resource, query),
  ]);
  const definition = getAdminResourceDefinition(resource);
  const forms = getAdminForms(resource, options);
  const currentPath = `/admin/${resource}/`;

  return (
    <AppShell currentPath={currentPath} user={actor}>
      <AdminRefineProvider>
        <div className="space-y-6">
          <PageHeader title={definition.label} description={definition.description} />
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <KpiCard label="Организации" value={String(summary.organizations)} tone="primary" />
            <KpiCard label="Проекты" value={String(summary.projects)} />
            <KpiCard label="Сайты" value={String(summary.sites)} />
            <KpiCard label="Источники" value={String(summary.enabledProviders)} tone="soft" />
            <KpiCard label="Sync выполняется" value={String(summary.runningSyncs)} />
            <KpiCard label="Задания в очереди" value={String(summary.pendingJobs)} />
          </section>

          <AdminResourceNav currentPath={currentPath} />

          <Card>
            <CardContent className="space-y-4">
              <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_160px_auto]" method="get">
                <label className="space-y-1.5">
                  <span className="block text-sm font-medium text-slate-800">Поиск</span>
                  <input className="min-h-11 w-full rounded-xl border border-[var(--crm-border-strong)] bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" defaultValue={query.search} name="q" placeholder="Название, slug или ID" />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-sm font-medium text-slate-800">Сортировка</span>
                  <select className="min-h-11 w-full rounded-xl border border-[var(--crm-border-strong)] bg-white px-3 pr-12 text-sm" defaultValue={query.sort} name="sort">
                    <option value="updatedAt">Обновлено</option>
                    <option value="createdAt">Создано</option>
                    <option value="name">Название</option>
                    <option value="status">Статус</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="block text-sm font-medium text-slate-800">Направление</span>
                  <select className="min-h-11 w-full rounded-xl border border-[var(--crm-border-strong)] bg-white px-3 pr-12 text-sm" defaultValue={query.direction} name="direction">
                    <option value="desc">По убыванию</option>
                    <option value="asc">По возрастанию</option>
                  </select>
                </label>
                <Button className="self-end" type="submit">Применить</Button>
              </form>

              {resourcePage.rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">Записей по текущему фильтру нет.</div>
              ) : (
                <>
                  <div className="grid gap-3 md:hidden">
                    {resourcePage.rows.map((row) => (
                      <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <strong className="text-sm text-slate-950">{row.primary}</strong>
                          <Badge>{row.status}</Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">{row.secondary}</p>
                        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                          <div>
                            <dt className="font-medium text-slate-500">Обновлено</dt>
                            <dd className="mt-1 tabular-nums text-slate-800">
                              {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(row.updatedAt))}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-slate-500">ID</dt>
                            <dd className="mt-1"><code className="break-all text-slate-700">{row.id}</code></dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                    <table className="min-w-[760px] w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr><th className="px-4 py-3">Запись</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3">Обновлено</th><th className="px-4 py-3">ID</th></tr>
                      </thead>
                      <tbody>
                        {resourcePage.rows.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                            <td className="px-4 py-3"><strong className="block text-slate-950">{row.primary}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{row.secondary}</span></td>
                            <td className="px-4 py-3"><Badge>{row.status}</Badge></td>
                            <td className="px-4 py-3 tabular-nums text-slate-600">{new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.updatedAt))}</td>
                            <td className="max-w-48 px-4 py-3"><code className="break-all text-xs text-slate-500">{row.id}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <span>Всего: {resourcePage.total}. Страница {resourcePage.page} из {resourcePage.pageCount}.</span>
                <div className="flex gap-2">
                  {resourcePage.page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 font-semibold text-slate-700" href={pageHref(resource, query, resourcePage.page - 1)}>Назад</Link> : null}
                  {resourcePage.page < resourcePage.pageCount ? <Link className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 font-semibold text-slate-700" href={pageHref(resource, query, resourcePage.page + 1)}>Дальше</Link> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="grid items-start gap-4 xl:grid-cols-2">
            {forms.map((form) => <AdminCommandForm key={form.command} form={form} />)}
          </section>
        </div>
      </AdminRefineProvider>
    </AppShell>
  );
}
