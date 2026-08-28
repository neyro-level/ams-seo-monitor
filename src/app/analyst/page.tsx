import Link from "next/link";
import { AppShell } from "../../components/shell/AppShell";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { PageHeader } from "../../components/dashboard/PageHeader";
import { SectionCard } from "../../components/dashboard/SectionCard";
import { StatusBanner } from "../../components/dashboard/StatusBanner";
import { buildAnalystOverview } from "../../modules/dashboards/overview";

export default function AnalystPage() {
  const overview = buildAnalystOverview();

  return (
    <AppShell currentPath="/analyst/">
      <div className="space-y-6">
        <PageHeader
          eyebrow="АМС"
          title="Общий кабинет"
          description="Верхний уровень AMS SEO Monitor: проекты, сайты и готовность источников."
        />

        <StatusBanner
          tone="info"
          title="Read-only контур готов к обкатке"
          description="Проекты пока создаются через безопасный operator wizard. Полноценная browser-админка и БД остаются будущей волной."
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Проекты" value={String(overview.totalProjects)} tone="primary" />
          <KpiCard label="Всего сайтов" value={String(overview.totalSites)} />
          <KpiCard label="Подключённые источники" value={String(overview.enabledSources)} />
          <KpiCard label="Плановые сайты" value={String(overview.plannedSites)} tone="soft" />
        </section>

        <SectionCard title="Управление" note="Без БД">
          <div className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-muted)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--crm-text-muted)]">
                Реестр
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--crm-text)]">Проекты и сайты</h2>
              <p className="mt-2 text-sm leading-5 text-[var(--crm-text-secondary)]">
                REDACTED_CLIENT_DATA, Союз застройщиков и следующие проекты в одной проверяемой иерархии.
              </p>
              <Link
                href="/analyst/projects/"
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Открыть проекты
              </Link>
            </article>
            <article className="rounded-2xl border border-[var(--crm-border)] bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--crm-text-muted)]">
                Добавление
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--crm-text)]">Operator wizard</h2>
              <p className="mt-2 text-sm leading-5 text-[var(--crm-text-secondary)]">
                Новый проект создаётся локальной командой, проходит validation и не затрагивает production автоматически.
              </p>
              <code className="mt-4 block rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-muted)] px-3 py-2 text-sm text-[var(--crm-text)]">
                pnpm project:add
              </code>
            </article>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
