import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  eyebrowHref?: string;
  cabinetHref?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  backHref?: string;
};

export function PageHeader({
  eyebrow,
  eyebrowHref,
  cabinetHref = "/analyst/",
  title,
  description,
  actions,
  backHref,
}: PageHeaderProps) {
  const resolvedEyebrowHref = eyebrowHref ?? backHref;
  return (
    <header className="border-b border-[var(--border)] pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <nav
            aria-label="Хлебные крошки"
            className="flex items-center gap-1.5 text-[12px] font-medium text-app-muted-foreground"
          >
            <Link
              href={cabinetHref}
              className="rounded-[var(--radius)] transition-colors hover:text-app-link hover:underline focus-visible:text-app-link"
            >
              Кабинет
            </Link>
            {eyebrow ? (
              <>
                <span aria-hidden className="text-app-border">
                  ›
                </span>
                {resolvedEyebrowHref ? (
                  <Link
                    href={resolvedEyebrowHref}
                    className="rounded-[var(--radius)] transition-colors hover:text-app-link hover:underline focus-visible:text-app-link"
                  >
                    {eyebrow}
                  </Link>
                ) : (
                  <span aria-current="page">{eyebrow}</span>
                )}
              </>
            ) : null}
          </nav>
          <div className="flex min-w-0 items-center gap-2.5">
            {backHref ? (
              <Link
                href={backHref}
                aria-label="Назад"
                title="Назад"
                className="group inline-flex h-10 shrink-0 items-center pr-1 text-app-muted-foreground transition hover:text-app-primary"
              >
                <ArrowLeft
                  className="h-5 w-5 transition-transform group-hover:-translate-x-0.5"
                  strokeWidth={1.7}
                />
              </Link>
            ) : null}
            <h1 className="truncate text-xl font-semibold leading-tight tracking-tight text-app-foreground sm:text-2xl">
              {title}
            </h1>
          </div>
          <p className="max-w-4xl break-words text-sm leading-6 text-app-secondary">
            {description}
          </p>
        </div>
        {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
