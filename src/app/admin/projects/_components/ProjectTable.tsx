"use client";

import {
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { impulseTableFeatures } from "../../../../components/tables/tanstack.ts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table.tsx";
import type {
  ProjectFormOptions,
  ProjectListItem,
  ProjectListResult,
  ProjectStatus,
} from "../../../../modules/project-registry/contracts.ts";
import { ProjectRowActions } from "./ProjectForms.tsx";

export interface ProjectTableQuery {
  page: number;
  search: string;
  status: ProjectStatus | null;
  sort: "name" | "status" | "updatedAt";
  direction: "asc" | "desc";
}

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVE: "Активен",
  PLANNED: "Запланирован",
  DISABLED: "Отключён",
};

const statusClassNames: Record<ProjectStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PLANNED: "bg-amber-50 text-amber-800 ring-amber-200",
  DISABLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

function projectHref(query: ProjectTableQuery, patch: Partial<ProjectTableQuery>) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.page > 1) params.set("page", String(next.page));
  if (next.search) params.set("search", next.search);
  if (next.status) params.set("status", next.status);
  if (next.sort !== "updatedAt") params.set("sort", next.sort);
  if (next.direction !== "desc") params.set("direction", next.direction);
  const value = params.toString();
  return value ? `/admin/projects?${value}` : "/admin/projects";
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClassNames[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function SortLink({
  field,
  label,
  query,
}: {
  field: ProjectTableQuery["sort"];
  label: string;
  query: ProjectTableQuery;
}) {
  const active = query.sort === field;
  const direction = active && query.direction === "asc" ? "desc" : "asc";
  return (
    <Link
      className="inline-flex min-h-11 items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-700"
      href={projectHref(query, { page: 1, sort: field, direction })}
    >
      {label}
      {active ? (
        query.direction === "asc" ? <ChevronUp aria-hidden="true" className="size-3.5" /> : <ChevronDown aria-hidden="true" className="size-3.5" />
      ) : <ChevronDown aria-hidden="true" className="size-3.5 opacity-30" />}
    </Link>
  );
}

export function ProjectTable({
  result,
  options,
  query,
}: {
  result: ProjectListResult;
  options: ProjectFormOptions;
  query: ProjectTableQuery;
}) {
  const columns = useMemo<ColumnDef<typeof impulseTableFeatures, ProjectListItem, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => <SortLink field="name" label="Проект" query={query} />,
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-slate-950">{row.original.name}</p>
            <p className="mt-1 text-xs text-slate-500">{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "organizationName",
        header: "Организация",
        cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.organizationName}</span>,
      },
      {
        accessorKey: "status",
        header: () => <SortLink field="status" label="Статус" query={query} />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "updatedAt",
        header: () => <SortLink field="updatedAt" label="Обновлён" query={query} />,
        cell: ({ row }) => (
          <time className="whitespace-nowrap text-sm text-slate-600" dateTime={row.original.updatedAt}>
            {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(row.original.updatedAt))}
          </time>
        ),
      },
      {
        id: "actions",
        header: "Управление",
        cell: ({ row }) => (
          <ProjectRowActions key={`${row.original.id}:${row.original.version}`} project={row.original} options={options} />
        ),
      },
    ],
    [options, query],
  );
  const table = useTable({
    features: impulseTableFeatures,
    data: result.items,
    columns,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  if (result.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
        <h2 className="text-base font-semibold text-slate-900">Проекты не найдены</h2>
        <p className="mt-2 text-sm text-slate-600">Измените фильтры или создайте первый проект.</p>
      </div>
    );
  }

  return (
    <section aria-label="Список проектов" className="space-y-4">
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
        <Table className="min-w-[980px] text-left">
          <TableHeader className="bg-[var(--crm-surface-muted)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead className="py-2 text-slate-600" key={header.id} scope="col">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => (
              <TableRow className="align-top hover:bg-slate-50" key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell className="px-4 py-4" key={cell.id}><table.FlexRender cell={cell} /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {result.items.map((project) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-4" key={project.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">{project.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{project.slug}</p>
              </div>
              <StatusBadge status={project.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-slate-500">Организация</dt><dd className="mt-1 text-slate-800">{project.organizationName}</dd></div>
              <div><dt className="text-xs text-slate-500">Версия</dt><dd className="mt-1 text-slate-800">{project.version}</dd></div>
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <ProjectRowActions key={`${project.id}:${project.version}`} project={project} options={options} />
            </div>
          </article>
        ))}
      </div>

      <nav aria-label="Пагинация проектов" className="flex items-center justify-between gap-3">
        <Link
          aria-disabled={result.page <= 1}
          className={`inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 ${result.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
          href={projectHref(query, { page: Math.max(1, result.page - 1) })}
        >
          Назад
        </Link>
        <span className="text-sm text-slate-600">Страница {result.page} из {pageCount}</span>
        <Link
          aria-disabled={result.page >= pageCount}
          className={`inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 ${result.page >= pageCount ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
          href={projectHref(query, { page: Math.min(pageCount, result.page + 1) })}
        >
          Далее
        </Link>
      </nav>
    </section>
  );
}
