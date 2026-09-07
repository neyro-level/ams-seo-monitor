export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { KpiCard } from "../../components/dashboard/KpiCard.tsx";
import { PageHeader } from "../../components/dashboard/PageHeader.tsx";
import { SectionCard } from "../../components/dashboard/SectionCard.tsx";
import {
  getCurrentCabinetRedirect,
  getCurrentPrincipalState,
} from "../../modules/identity-access/server.ts";
import { buildAnalystOverview } from "../../modules/project-registry/presentation.ts";
import { hasPermission } from "../../platform/authorization/principal.ts";

export default async function AllProjectsPage() {
  const cabinetRedirect = await getCurrentCabinetRedirect();
  if (cabinetRedirect) redirect(cabinetRedirect);
  const state = await getCurrentPrincipalState();
  if (!state) redirect("/?login=1");
  if (!hasPermission(state.principal, "project:read:any")) {
    redirect("/dashboard/");
  }

  const overview = await buildAnalystOverview(state.principal);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Все проекты"
          description="Проекты АМС, их сайты и готовность конфигурации источников."
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
                    ? "Настроен"
                    : project.connectedSites > 0
                      ? "Настройка"
                      : "План";
              const stateClasses =
                project.status === "DISABLED"
                  ? "border-[var(--status-neutral)]/20 bg-[var(--status-neutral-soft)] text-[var(--status-neutral)]"
                  : projectReady
                    ? "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]"
                    : project.connectedSites > 0
                      ? "border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]"
                      : "border-[var(--info)]/20 bg-[var(--info-soft)] text-[var(--info)]";

              return (
                <article
                  key={project.projectSlug}
                  className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                        {project.projectSlug}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
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
                    <div className="rounded-[var(--radius-panel)] bg-[var(--muted)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                        Сайты
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                        {project.totalSites}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-panel)] bg-[var(--muted)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                        Подключено
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                        {project.connectedSites}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-panel)] bg-[var(--muted)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                        Готово
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                        {project.readySites}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-panel)] bg-[var(--muted)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                        Источники
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                        {project.enabledSources}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-[var(--text-secondary)]">
                    {projectReady
                      ? "Все сайты заведены"
                      : project.connectedSites > 0
                        ? `Плановых сайтов: ${project.totalSites - project.connectedSites}`
                        : "Источники ещё не подключены"}
                  </p>

                  <Link
                    href={`/c/${project.projectSlug}/`}
                    className="mt-5 inline-flex rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)]"
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
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Пока без production-админки
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Wizard создаёт project/site config и пустой goal profile, проверяет collisions и общий registry. Секреты, deploy и SourceCraft он не изменяет.
              </p>
            </div>
            <code className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
              pnpm project:add
            </code>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
