import { Building2, ChartNoAxesCombined, FlaskConical, Globe2, House } from "lucide-react";
import Link from "next/link";
import type { NavigationSection } from "../../modules/access/navigation";

type ShellNavProps = {
  sections: NavigationSection[];
  onNavigate?: () => void;
};

export function ShellNav({ sections, onNavigate }: ShellNavProps) {
  return (
    <nav className="space-y-6" aria-label="Навигация по отчётам">
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            {section.title}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.children?.length
                ? Building2
                : item.href === "/analyst/"
                  ? ChartNoAxesCombined
                  : item.href === "/demo/"
                    ? FlaskConical
                    : House;

              return (
                <li key={item.href} className="space-y-1">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={[
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                      item.active
                        ? "bg-white text-[var(--crm-sidebar)] shadow-sm"
                        : "text-slate-200 hover:bg-white/9 hover:text-white",
                    ].join(" ")}
                  >
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                  {item.children?.length ? (
                    <ul className="space-y-1 pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={onNavigate}
                            className={[
                              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                              child.active
                                ? "bg-white text-[var(--crm-sidebar)] shadow-sm"
                                : child.muted
                                  ? "text-slate-400 hover:bg-white/7 hover:text-slate-200"
                                  : "text-slate-300 hover:bg-white/7 hover:text-white",
                            ].join(" ")}
                          >
                            <Globe2 className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        </li>
                      ))}
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
