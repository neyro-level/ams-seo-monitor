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
            <Link
              href="/analyst/"
              className="rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              Все проекты
            </Link>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Проекты" value={String(overview.totalProjects)} tone="primary" />
          <KpiCard label="Маршруты сайтов" value={String(overview.totalSites)} />
          <KpiCard label="Подключённые" value={String(overview.connectedSites)} />
          <KpiCard label="Плановые" value={String(overview.plannedSites)} tone="soft" />
        </section>

        <SectionCard title="Текущий контур" note="Backend rebuild in progress">
          <ul className="grid gap-3 text-sm text-[var(--crm-text-secondary)] md:grid-cols-2">
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Продуктовые роли и маршруты сохраняются при перестройке backend foundation.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Webmaster, Metrica и Topvisor остаются read-only provider adapters.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Следующая архитектура переводит runtime в Next server + PostgreSQL + Worker.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">SiteReportSnapshot и SEO semantics остаются browser-safe контрактом отчёта.</li>
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
