export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "../../components/shell/AppShell";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { PageHeader } from "../../components/dashboard/PageHeader";
import { SectionCard } from "../../components/dashboard/SectionCard";
import { buildAnalystOverview } from "../../modules/dashboards/overview";

export default async function AllProjectsPage() {
  const overview = await buildAnalystOverview();

  return (
    <AppShell currentPath="/analyst/">
      <div className="space-y-6">
        <PageHeader
          title="Все проекты"
          description="Проекты АМС, их сайты, подключённые источники и готовность отчётов."
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Проекты" value={String(overview.totalProjects)} tone="primary" />
          <KpiCard label="Сайты" value={String(overview.totalSites)} />
          <KpiCard label="Подключённые сайты" value={String(overview.connectedSites)} />
          <KpiCard label="Источники" value={String(overview.enabledSources)} tone="soft" />
        </section>

        <SectionCard title="Реестр проектов" note="Database-backed">
          <div className="grid gap-4 xl:grid-cols-2">
            {overview.projectCards.map((project) => {
              const projectReady =
                project.status !== "DISABLED" &&
                project.totalSites > 0 &&
                project.readySites === project.totalSites;
              const stateLabel =
                project.status === "DISABLED"
                  ? "Отключён"
                  : projectReady
                    ? "Готов"
                    : project.connectedSites > 0
                      ? "Настройка"
                      : "План";
              const stateClasses =
                project.status === "DISABLED"
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : projectReady
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : project.connectedSites > 0
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-sky-200 bg-sky-50 text-sky-950";

              return (
                <article
                  key={project.projectSlug}
                  className="rounded-2xl border border-[var(--crm-border)] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--crm-text-muted)]">
                        {project.projectSlug}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-[var(--crm-text)]">
                        {project.name}
                      </h2>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${stateClasses}`}
                    >
                      {stateLabel}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--crm-text-muted)]">
                        Сайты
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--crm-text)]">
                        {project.totalSites}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--crm-text-muted)]">
                        Подключено
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--crm-text)]">
                        {project.connectedSites}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--crm-text-muted)]">
                        Готово
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--crm-text)]">
                        {project.readySites}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--crm-text-muted)]">
                        Источники
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--crm-text)]">
                        {project.enabledSources}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-[var(--crm-text-secondary)]">
                    {projectReady
                      ? "Все сайты заведены"
                      : project.connectedSites > 0
                        ? `Плановых сайтов: ${project.totalSites - project.connectedSites}`
                        : "Источники ещё не подключены"}
                  </p>

                  <Link
                    href={`/c/${project.projectSlug}/`}
                    className="mt-5 inline-flex rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Открыть проект
                  </Link>
                </article>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Добавление проекта" note="Operator-only">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-lg font-semibold text-[var(--crm-text)]">
                Пока без production-админки
              </h2>
              <p className="mt-2 text-sm text-[var(--crm-text-secondary)]">
                Wizard создаёт project/site config и пустой goal profile, проверяет collisions и общий registry. Секреты, deploy и SourceCraft он не изменяет.
              </p>
            </div>
            <code className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--crm-text)]">
              pnpm project:add
            </code>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
