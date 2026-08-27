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
          eyebrow="Foundation"
          title="AMS SEO Monitor"
          description="Отдельный статический SEO dashboard для нескольких клиентов. Эта волна фиксирует shell, registry, routes и snapshot contract до live integrations."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/demo/" className="rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-semibold text-white">
                Открыть демо
              </Link>
              <Link href="/analyst/" className="rounded-xl border border-[var(--crm-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--crm-text)]">
                Аналитик
              </Link>
            </div>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Клиенты" value={String(overview.totalClients)} tone="primary" />
          <KpiCard label="Маршруты сайтов" value={String(overview.totalSites)} />
          <KpiCard label="Подключённые" value={String(overview.connectedSites)} />
          <KpiCard label="Плановые" value={String(overview.plannedSites)} tone="soft" />
        </section>

        <SectionCard title="Что уже собрано" note="Wave 1">
          <ul className="grid gap-3 text-sm text-[var(--crm-text-secondary)] md:grid-cols-2">
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Отдельный репозиторий и core canon документация.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Static shell по frozen REDACTED_CLIENT_DATA analytics contract.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Registry-driven client and site routes.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Snapshot DTO и local storage engine на fixtures.</li>
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
