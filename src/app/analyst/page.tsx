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
          eyebrow="SEO_ANALYST"
          title="Analyst overview"
          description="Owner view показывает статический foundation для всех первых клиентов. Live sync health появится после Wave 2 и Wave 3."
        />

        <StatusBanner
          tone="info"
          title="Foundation mode"
          description="Текущие числа нужны для proof shell и report DTO. Дальше они будут заменены live read-only collection без смены маршрутов."
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Клиенты" value={String(overview.totalClients)} tone="primary" />
          <KpiCard label="Всего сайтов" value={String(overview.totalSites)} />
          <KpiCard label="Fixture snapshots" value={String(overview.activeSnapshots)} />
          <KpiCard label="Плановые сайты" value={String(overview.plannedSites)} tone="soft" />
        </section>

        <SectionCard title="Клиенты" note="Registry-driven">
          <div className="grid gap-3 lg:grid-cols-2">
            {overview.clientCards.map((client) => (
              <article key={client.clientSlug} className="rounded-[8px] border border-[var(--report-border)] bg-[var(--report-surface-muted)] p-4">
                <h2 className="text-lg font-semibold text-[var(--report-text)]">{client.name}</h2>
                <p className="mt-2 text-sm text-[var(--report-text-secondary)]">
                  {client.connectedSites} подключён / {client.plannedSites} ожидает onboarding.
                </p>
                <Link
                  href={`/c/${client.clientSlug}/`}
                  className="mt-4 inline-flex rounded-xl bg-[var(--report-sidebar)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Открыть клиента
                </Link>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
