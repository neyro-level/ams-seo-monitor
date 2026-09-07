export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { AppShell } from "../../../components/shell/AppShell.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { Input } from "../../../components/ui/input.tsx";
import { NativeSelect } from "../../../components/ui/native-select.tsx";
import {
  getProjectFormOptions,
  listProjects,
} from "../../../modules/project-registry/server.ts";
import { hasPermission } from "../../../platform/authorization/principal.ts";
import { getCurrentPrincipalState } from "../../../platform/auth/principal-session.ts";
import { ProjectCreateForm } from "./_components/ProjectForms.tsx";
import { ProjectTable } from "./_components/ProjectTable.tsx";
import {
  loadProjectSearchParams,
  serializeProjectSearchParams,
} from "./search-params.ts";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const state = await getCurrentPrincipalState();
  if (!state) redirect("/?login=1");

  if (!hasPermission(state.principal, "project:manage:any")) {
    return (
      <AppShell currentPath="/admin/projects" principal={state.principal} displayName={state.displayName}>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6" role="alert">
            <h1 className="text-xl font-semibold text-slate-950">Раздел недоступен</h1>
            <p className="mt-2 text-sm leading-6 text-slate-700">У текущей роли нет права управлять проектами.</p>
          </div>
        </main>
      </AppShell>
    );
  }

  const parsed = await loadProjectSearchParams(searchParams);
  const query = {
    page: Math.max(1, parsed.page),
    pageSize: 20,
    search: parsed.search.trim().slice(0, 100),
    status: parsed.status,
    sort: parsed.sort,
    direction: parsed.direction,
  } as const;
  const [projects, options] = await Promise.all([
    listProjects(state.principal, query),
    getProjectFormOptions(state.principal),
  ]);
  const pageCount = Math.max(1, Math.ceil(projects.total / projects.pageSize));
  if (query.page > pageCount) {
    redirect(serializeProjectSearchParams("/admin/projects", { ...parsed, page: pageCount }));
  }
  const hasRequiredOptions =
    options.organizations.length > 0 &&
    options.thresholdProfiles.length > 0 &&
    options.clusterProfiles.length > 0;
  const filtersActive = Boolean(query.search || query.status);

  return (
    <AppShell currentPath="/admin/projects" principal={state.principal} displayName={state.displayName}>
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Platform Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Проекты</h1>
          <p className="mt-2 text-sm text-slate-600">{projects.total} в текущем срезе реестра</p>
        </header>

        {hasRequiredOptions ? (
          <ProjectCreateForm options={options} />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5" role="alert">
            <h2 className="font-semibold text-slate-900">Создание проекта недоступно</h2>
            <p className="mt-1 text-sm text-slate-700">Сначала добавьте организацию, пороговый и кластерный профили.</p>
          </div>
        )}

        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]" method="get">
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">Поиск</span>
            <Input
              defaultValue={query.search}
              maxLength={100}
              name="search"
              placeholder="Название или slug"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">Статус</span>
            <NativeSelect
              defaultValue={query.status ?? ""}
              name="status"
            >
              <option value="">Все статусы</option>
              <option value="ACTIVE">Активные</option>
              <option value="PLANNED">Запланированные</option>
              <option value="DISABLED">Отключённые</option>
            </NativeSelect>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit">Применить</Button>
            {filtersActive ? <Link className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-slate-600 hover:text-slate-950" href="/admin/projects">Сбросить</Link> : null}
          </div>
        </form>

        <ProjectTable
          options={options}
          query={{
            page: query.page,
            search: query.search,
            status: query.status,
            sort: query.sort,
            direction: query.direction,
          }}
          result={projects}
        />
      </main>
    </AppShell>
  );
}
