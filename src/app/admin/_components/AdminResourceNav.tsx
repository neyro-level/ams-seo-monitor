"use client";

import { useMenu } from "@refinedev/core";
import Link from "next/link";
import { cn } from "../../../shared/lib/cn";

export function AdminResourceNav({ currentPath }: { currentPath: string }) {
  const { menuItems } = useMenu();

  return (
    <nav aria-label="Ресурсы администрирования" className="flex gap-2 overflow-x-auto pb-1">
      {menuItems.map((item) => {
        const href = typeof item.route === "string" ? item.route : `/admin/${item.name}/`;
        const active = currentPath === href;
        return (
          <Link
            key={item.key}
            href={href}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-xl border px-4 text-sm font-semibold transition-colors",
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {String(item.meta?.label ?? item.label ?? item.name)}
          </Link>
        );
      })}
    </nav>
  );
}
