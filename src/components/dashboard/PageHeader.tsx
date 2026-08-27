import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  backHref?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
}: PageHeaderProps) {
  return (
    <header className="sticky top-14 z-20 -mx-4 -mt-6 border-b border-slate-200/90 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:-mt-8 lg:px-8">
      <div className="flex min-h-[64px] items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {eyebrow ? (
            <p className="text-[12px] font-medium text-[var(--crm-text-muted)]">
              Кабинет <span className="px-1.5 text-slate-300">›</span> {eyebrow}
            </p>
          ) : null}
          <div className="flex min-w-0 items-center gap-2.5">
            {backHref ? (
              <Link
                href={backHref}
                aria-label="Назад"
                title="Назад"
                className="group inline-flex h-10 shrink-0 items-center pr-1 text-slate-500 transition hover:text-[var(--crm-primary)]"
              >
                <ArrowLeft
                  className="h-5 w-5 transition-transform group-hover:-translate-x-0.5"
                  strokeWidth={1.7}
                />
              </Link>
            ) : null}
            <h1 className="truncate text-xl font-semibold leading-tight tracking-tight text-[var(--crm-text)] sm:text-2xl">
              {title}
            </h1>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-[var(--crm-text-secondary)]">
            {description}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
