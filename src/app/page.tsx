import Link from "next/link";
import { AppShell } from "../components/shell/AppShell";
import { KpiCard } from "../components/dashboard/KpiCard";
import { PageHeader } from "../components/dashboard/PageHeader";
import { SectionCard } from "../components/dashboard/SectionCard";
import { buildAnalystOverview } from "../modules/dashboards/overview";

export default function HomePage() {
  const overview = buildAnalystOverview();

  return (
    <AppShell currentPath="/">
      <div className="space-y-6">
        <PageHeader
          eyebrow="АМС"
          title="AMS SEO Monitor"
          description="Приватный SEO-кабинет: проекты, сайты, Яндекс.Вебмастер, Метрика и управленческие отчёты."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/analyst/projects/" className="rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-semibold text-white">
                Проекты
              </Link>
              <Link href="/analyst/" className="rounded-xl border border-[var(--crm-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--crm-text)]">
                Общий кабинет
              </Link>
            </div>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Проекты" value={String(overview.totalProjects)} tone="primary" />
          <KpiCard label="Маршруты сайтов" value={String(overview.totalSites)} />
          <KpiCard label="Подключённые" value={String(overview.connectedSites)} />
          <KpiCard label="Плановые" value={String(overview.plannedSites)} tone="soft" />
        </section>

        <SectionCard title="Текущий контур" note="Read-only MVP">
          <ul className="grid gap-3 text-sm text-[var(--crm-text-secondary)] md:grid-cols-2">
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Проекты и сайты задаются проверяемой конфигурацией.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Webmaster и Metrica собираются read-only collector.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Snapshots публикуются атомарно по четырём периодам.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Production остаётся static export без БД и standalone backend.</li>
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
