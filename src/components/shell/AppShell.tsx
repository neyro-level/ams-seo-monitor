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
    <div className="min-h-screen bg-[var(--report-page)] text-[var(--report-text)]">
      <aside className="fixed inset-y-0 left-0 hidden w-[260px] border-r border-white/10 bg-[var(--report-sidebar)] px-4 py-5 lg:block">
        <div className="mb-6 rounded-2xl border border-white/12 bg-white/[0.055] p-4 text-white">
          <div className="inline-flex rounded-full bg-linear-to-r from-sky-300 to-blue-500 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-950">
            АМС
          </div>
          <p className="mt-4 text-lg font-semibold">SEO-мониторинг</p>
          <p className="mt-1 text-sm text-slate-300">Static dashboard foundation</p>
        </div>
        <ShellNav sections={sections} />
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--report-sidebar)] px-4 py-3 text-white lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">АМС</p>
              <p className="text-sm font-semibold">SEO-мониторинг</p>
            </div>
            <MobileDrawer sections={sections} />
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
