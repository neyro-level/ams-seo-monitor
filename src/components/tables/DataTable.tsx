import type { ReactNode } from "react";

type DataTableProps = {
  caption: string;
  columns: string[];
  rows: Array<{
    key: string;
    cells: ReactNode[];
  }>;
};

export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <div className="min-w-0 w-full max-w-full overflow-x-auto rounded-2xl border border-[var(--crm-border)] bg-white">
      <table className="min-w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-[var(--crm-surface-muted)]">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--crm-text-muted)]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-[var(--crm-border)] align-top">
              {row.cells.map((cell, index) => (
                <td key={`${row.key}-${index}`} className="px-4 py-3 text-[var(--crm-text-secondary)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
