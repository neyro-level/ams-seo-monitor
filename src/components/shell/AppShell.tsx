import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { buildNavigation } from "../../modules/access/navigation";
import { MobileDrawer } from "./MobileDrawer";
import { ShellNav } from "./ShellNav";

type AppShellProps = {
  currentPath: string;
  children: ReactNode;
};

export function AppShell({ currentPath, children }: AppShellProps) {
  const sections = buildNavigation(currentPath);

  return (
    <div className="admin-root min-h-screen bg-[var(--crm-page)] text-[var(--crm-text)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] lg:block">
        <div className="flex h-full flex-col bg-[var(--crm-sidebar)] text-slate-100">
          <div className="flex min-h-[88px] items-center border-b border-white/10 px-3 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.055] px-3.5 py-3 text-white shadow-[0_14px_36px_rgba(0,0,0,0.16)]">
              <span className="grid h-9 shrink-0 place-items-center rounded-full bg-linear-to-r from-sky-300 to-blue-400 px-3 text-[11px] font-bold tracking-[0.16em] text-[#06253a] shadow-[0_8px_20px_rgba(56,189,248,0.24)]">
                АМС
              </span>
              <span className="truncate text-[12px] font-light tracking-[0.06em] text-slate-200">
                SEO-мониторинг
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 pt-6">
            <ShellNav sections={sections} />
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.055] px-2.5 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-slate-200">
                <ShieldCheck className="size-4" strokeWidth={1.8} aria-hidden />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                Защищённый кабинет
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 min-h-screen overflow-x-hidden lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur lg:hidden">
          <MobileDrawer sections={sections} />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
            SEO-мониторинг
          </p>
        </header>

        <main className="min-w-0 w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
