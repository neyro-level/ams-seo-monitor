"use client";

import { Building2, ChartNoAxesCombined, Globe2 } from "lucide-react";
import Link from "next/link";
import type { NavigationSection } from "../../modules/project-registry/presentation.ts";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.tsx";

type ShellNavProps = {
  sections: NavigationSection[];
  currentPath: string;
  collapsed?: boolean;
  onNavigate?: () => void;
};

function NavigationLink({ href, label, active, muted, collapsed, onNavigate, child = false }: { href: string; label: string; active: boolean; muted?: boolean; collapsed: boolean; onNavigate?: () => void; child?: boolean }) {
  const Icon = child ? Globe2 : href.startsWith("/c/") ? Building2 : ChartNoAxesCombined;
  const link = (
    <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center rounded-[var(--radius-control)] text-sm transition-colors ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-[var(--sidebar-accent)] font-semibold text-[var(--sidebar-accent-foreground)]" : muted ? "text-[var(--sidebar-muted)] hover:bg-white/6" : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)]"}`}>
      <Icon className={`${child ? "size-4" : "size-5"} shrink-0`} strokeWidth={1.8} aria-hidden />
      {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return <Tooltip><TooltipTrigger render={link} /><TooltipContent>{label}</TooltipContent></Tooltip>;
}

export function ShellNav({ sections, currentPath, collapsed = false, onNavigate }: ShellNavProps) {
  return (
    <nav className="space-y-6" aria-label="Навигация по отчётам">
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          {section.title && !collapsed ? <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sidebar-muted)]">{section.title}</p> : null}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = currentPath === item.href || (item.href.startsWith("/c/") && currentPath.startsWith(item.href)) || (item.href.startsWith("/admin/") && currentPath.startsWith("/admin/"));
              return (
                <li key={item.href} className="space-y-1">
                  <NavigationLink href={item.href} label={item.label} active={active} collapsed={collapsed} onNavigate={onNavigate} />
                  {!collapsed && item.children?.length ? (
                    <ul className="space-y-1 pl-3">
                      {item.children.map((child) => <li key={child.href}><NavigationLink href={child.href} label={child.label} active={currentPath === child.href} muted={child.muted} collapsed={false} onNavigate={onNavigate} child /></li>)}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
