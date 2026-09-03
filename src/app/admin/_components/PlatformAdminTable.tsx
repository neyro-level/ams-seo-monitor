"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  buildPlatformAdminPageHref,
  type PlatformAdminPageQuery,
  type PlatformAdminSortField,
} from "../../../modules/platform-admin/index.ts";

export interface PlatformAdminDisplayRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

function SortLink({
  field,
  label,
  resource,
  query,
}: {
  field: PlatformAdminSortField;
  label: string;
  resource: string;
  query: PlatformAdminPageQuery;
}) {
  const active = query.sort === field;
  const direction = active && query.direction === "asc" ? "desc" : "asc";
  return (
    <Link
      className="inline-flex min-h-11 items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-700"
      href={buildPlatformAdminPageHref(resource, query, { page: 1, sort: field, direction })}
    >
      {label}
      {active ? (
        query.direction === "asc" ? <ChevronUp aria-hidden="true" className="size-3.5" /> : <ChevronDown aria-hidden="true" className="size-3.5" />
      ) : <ChevronDown aria-hidden="true" className="size-3.5 opacity-30" />}
    </Link>
  );
}

export function PlatformAdminTable({
  resource,
  query,
  rows,
  total,
  pageSize,
  sortOptions,
}: {
  resource: string;
  query: PlatformAdminPageQuery;
  rows: PlatformAdminDisplayRow[];
  total: number;
  pageSize: number;
  sortOptions: Array<{ field: PlatformAdminSortField; label: string }>;
}) {
  const sortLabel = sortOptions.find((item) => item.field === query.sort)?.label ?? "Запись";
  const columns = useMemo<ColumnDef<PlatformAdminDisplayRow>[]>(
    () => [
      {
        accessorKey: "primary",
        header: () => <SortLink field={query.sort === "status" ? "name" : query.sort} label={sortLabel} query={query} resource={resource} />,
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-slate-950">{row.original.primary}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{row.original.secondary}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => <SortLink field="status" label="Статус" query={query} resource={resource} />,
        cell: ({ row }) => (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: () => <SortLink field="updatedAt" label="Обновлено" query={query} resource={resource} />,
        cell: ({ row }) => (
          <time className="whitespace-nowrap text-sm text-slate-600" dateTime={row.original.updatedAt}>
            {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.original.updatedAt))}
          </time>
        ),
      },
    ],
    [query, resource, sortLabel],
  );
  // TanStack Table owns a mutable table instance; React Compiler intentionally skips this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
    state: { pagination: { pageIndex: query.page - 1, pageSize } },
  });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
        <h2 className="text-base font-semibold text-slate-900">Записи не найдены</h2>
        <p className="mt-2 text-sm text-slate-600">Измените фильтр или создайте новую запись.</p>
      </div>
    );
  }

  return (
    <section aria-label="Список записей" className="space-y-4">
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead className="bg-[var(--crm-surface-muted)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600" key={header.id} scope="col">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => (
              <tr className="align-top transition-colors hover:bg-slate-50" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td className="px-4 py-4" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-4" key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-950">{row.primary}</h2>
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                {row.status}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{row.secondary}</p>
            <time className="mt-4 block text-xs text-slate-500" dateTime={row.updatedAt}>
              {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.updatedAt))}
            </time>
          </article>
        ))}
      </div>

      <nav aria-label="Пагинация раздела" className="flex items-center justify-between gap-3">
        <Link
          aria-disabled={query.page <= 1}
          className={`inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 ${query.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
          href={buildPlatformAdminPageHref(resource, query, { page: Math.max(1, query.page - 1) })}
        >
          Назад
        </Link>
        <span className="text-sm text-slate-600">Страница {query.page} из {pageCount}</span>
        <Link
          aria-disabled={query.page >= pageCount}
          className={`inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 ${query.page >= pageCount ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
          href={buildPlatformAdminPageHref(resource, query, { page: Math.min(pageCount, query.page + 1) })}
        >
          Далее
        </Link>
      </nav>
    </section>
  );
}
