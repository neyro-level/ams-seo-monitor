import Link from "next/link";
import { AppShell } from "../../../components/shell/AppShell";
import { KpiCard } from "../../../components/dashboard/KpiCard";
import { PageHeader } from "../../../components/dashboard/PageHeader";
import { SectionCard } from "../../../components/dashboard/SectionCard";
import { buildAnalystOverview } from "../../../modules/dashboards/overview";

export default function ProjectsPage() {
  const overview = buildAnalystOverview();

  return (
    <AppShell currentPath="/analyst/projects/">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Общий кабинет"
          eyebrowHref="/analyst/"
          backHref="/analyst/"
          title="Проекты"
          description="Верхний уровень иерархии. Каждый проект содержит собственные сайты, источники и отдельные отчёты."
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Проекты" value={String(overview.totalProjects)} tone="primary" />
          <KpiCard label="Сайты" value={String(overview.totalSites)} />
          <KpiCard label="Подключённые сайты" value={String(overview.connectedSites)} />
          <KpiCard label="Источники" value={String(overview.enabledSources)} tone="soft" />
        </section>

        <SectionCard title="Реестр проектов" note="Config-driven">
          <div className="grid gap-4 xl:grid-cols-2">
            {overview.projectCards.map((project) => {
              const projectReady =
                project.enabled &&
                project.totalSites > 0 &&
                project.readySites === project.totalSites;
              const stateLabel = !project.enabled
                ? "Отключён"
                : projectReady
                  ? "Готов"
                  : project.connectedSites > 0
                    ? "Настройка"
                    : "План";
              const stateClasses = !project.enabled
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--crm-text-muted)]">
                        {project.projectSlug}
                      </p>
                      <h2 className="mt-2 text-lg font-semibold text-[var(--crm-text)]">
                        {project.name}
                      </h2>
                    </div>
                    <span
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${stateClasses}`}
                    >
                      {stateLabel}
                    </span>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-[var(--crm-surface-muted)] p-3">
                      <dt className="text-[11px] text-[var(--crm-text-muted)]">Сайты</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--crm-text)]">
                        {project.totalSites}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-[var(--crm-surface-muted)] p-3">
                      <dt className="text-[11px] text-[var(--crm-text-muted)]">Подключено</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--crm-text)]">
                        {project.connectedSites}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-[var(--crm-surface-muted)] p-3">
                      <dt className="text-[11px] text-[var(--crm-text-muted)]">Готово</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--crm-text)]">
                        {project.readySites}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-[var(--crm-surface-muted)] p-3">
                      <dt className="text-[11px] text-[var(--crm-text-muted)]">Источники</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--crm-text)]">
                        {project.enabledSources}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--crm-border)] pt-4">
                    <p className="text-xs text-[var(--crm-text-muted)]">
                      {project.plannedSites > 0
                        ? `Плановых сайтов: ${project.plannedSites}`
                        : "Все сайты заведены"}
                    </p>
                    <Link
                      href={`/c/${project.projectSlug}/`}
                      className="inline-flex min-h-11 items-center rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Открыть проект
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Добавление проекта" note="Operator-only">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-base font-semibold text-[var(--crm-text)]">
                Пока без production-админки
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--crm-text-secondary)]">
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
