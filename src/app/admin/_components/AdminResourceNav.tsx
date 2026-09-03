import Link from "next/link";
import {
  NON_PROJECT_PLATFORM_ADMIN_RESOURCES,
} from "../../../modules/platform-admin/index.ts";
import { cn } from "../../../shared/lib/cn.ts";

export function AdminResourceNav({ currentPath }: { currentPath: string }) {
  return (
    <nav aria-label="Ресурсы администрирования" className="flex gap-2 overflow-x-auto pb-1">
      {NON_PROJECT_PLATFORM_ADMIN_RESOURCES.map((item) => {
        const active = currentPath === item.href;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-xl border px-4 text-sm font-semibold transition-colors",
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
