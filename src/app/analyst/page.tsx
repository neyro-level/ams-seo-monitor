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
          eyebrow="SEO-аналитик"
          title="Контур клиентов"
          description="Сайты и подключённые источники. Live report snapshots появятся после сборки единого data pipeline."
        />

        <StatusBanner
          tone="warning"
          title="Data pipeline ещё не замкнут"
          description="Webmaster и Metrica уже читаются live, но client snapshots пока не публикуются. Ниже показана только registry readiness."
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Клиенты" value={String(overview.totalClients)} tone="primary" />
          <KpiCard label="Всего сайтов" value={String(overview.totalSites)} />
          <KpiCard label="Подключённые источники" value={String(overview.enabledSources)} />
          <KpiCard label="Плановые сайты" value={String(overview.plannedSites)} tone="soft" />
        </section>

        <SectionCard title="Клиенты" note="Registry-driven">
          <div className="grid gap-3 lg:grid-cols-2">
            {overview.clientCards.map((client) => (
              <article key={client.clientSlug} className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-muted)] p-4">
                <h2 className="text-lg font-semibold text-[var(--crm-text)]">{client.name}</h2>
                <p className="mt-2 text-sm text-[var(--crm-text-secondary)]">
                  {client.connectedSites} подключён / {client.plannedSites} ожидает onboarding.
                </p>
                <Link
                  href={`/c/${client.clientSlug}/`}
                  className="mt-4 inline-flex rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-semibold text-white"
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
