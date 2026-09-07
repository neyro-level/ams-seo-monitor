"use client";

import { ChevronLeft, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { NavigationSection } from "../../modules/project-registry/presentation.ts";
import { authClient } from "../../platform/auth/client.ts";
import { Button } from "../ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.tsx";
import { MobileDrawer } from "./MobileDrawer.tsx";
import { ShellNav } from "./ShellNav.tsx";

type AppShellProps = {
  sections: NavigationSection[];
  displayName: string;
  children: ReactNode;
};

export function AppShell({ sections, displayName, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const activeLabel = sections
    .flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]))
    .find((item) => pathname === item.href || pathname.startsWith(item.href))?.label;

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="theme-app admin-root min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block ${collapsed ? "w-[72px]" : "w-[232px]"}`}>
        <div className="flex h-full flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
          <div className="flex h-16 items-center border-b border-[var(--sidebar-border)] px-3">
            <div className={`flex min-w-0 flex-1 items-center ${collapsed ? "justify-center" : "gap-3"}`}>
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--sidebar-primary)] text-[11px] font-bold tracking-[0.08em] text-[var(--sidebar-primary-foreground)]">АМС</span>
              {collapsed ? null : <span className="truncate text-xs font-semibold tracking-[0.12em]">IMPULSE</span>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-5">
            <ShellNav sections={sections} currentPath={pathname} collapsed={collapsed} />
          </div>

          <div className="border-t border-[var(--sidebar-border)] p-2">
            <div className={`flex min-h-11 items-center rounded-[var(--radius-control)] bg-white/[0.055] ${collapsed ? "justify-center" : "gap-2 px-2"}`}>
              <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-white/10 text-[var(--sidebar-foreground)]"><ShieldCheck className="size-4" strokeWidth={1.8} aria-hidden /></span>
              {collapsed ? null : <p className="min-w-0 flex-1 truncate text-sm font-medium">{displayName}</p>}
              {collapsed ? null : (
                <Button type="button" variant="ghost" size="icon" className="size-9 min-h-9 text-[var(--sidebar-muted)] hover:bg-white/10 hover:text-white" onClick={signOut} disabled={signingOut} aria-label="Выйти из кабинета">
                  <LogOut aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className={`min-h-screen min-w-0 overflow-x-hidden transition-[padding] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-[232px]"}`}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)]/95 px-4 backdrop-blur sm:px-6 lg:h-16">
          <div className="lg:hidden"><MobileDrawer sections={sections} currentPath={pathname} /></div>
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label={collapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight aria-hidden /> : <ChevronLeft aria-hidden />}</Button>} />
            <TooltipContent>{collapsed ? "Развернуть меню" : "Свернуть меню"}</TooltipContent>
          </Tooltip>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{activeLabel ?? "AMS IMPULSE"}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={signOut} disabled={signingOut} aria-label="Выйти из кабинета"><LogOut aria-hidden /></Button>
        </header>

        <main className="min-w-0 w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
