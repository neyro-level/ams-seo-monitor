import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/shell/AppShell";
import { KpiCard } from "../../../components/dashboard/KpiCard";
import { PageHeader } from "../../../components/dashboard/PageHeader";
import { SectionCard } from "../../../components/dashboard/SectionCard";
import { StatusBanner } from "../../../components/dashboard/StatusBanner";
import { buildClientOverview } from "../../../modules/dashboards/overview";
import { getClientStaticParams } from "../../../modules/client-registry/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return getClientStaticParams();
}

type ClientOverviewPageProps = {
  params: Promise<{
    clientSlug: string;
  }>;
};

export default async function ClientOverviewPage({ params }: ClientOverviewPageProps) {
  const { clientSlug } = await params;
  const overview = buildClientOverview(clientSlug);

  if (!overview) {
    notFound();
  }

  return (
    <AppShell currentPath={`/c/${overview.client.clientSlug}/`}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Клиент"
          title={overview.client.name}
          description="Каждый сайт сохраняет собственные источники, периоды и показатели. Разные города не складываются в искусственный общий рейтинг."
        />

        <StatusBanner
          tone="warning"
          title="Live-отчёты готовятся"
          description="Источники для подключённых сайтов уже подтверждены, но публикация единого snapshot ещё не включена."
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Всего сайтов" value={String(overview.sites.length)} tone="primary" />
          <KpiCard label="Подключённые" value={String(overview.sites.filter((site) => site.enabled).length)} />
          <KpiCard label="Плановые" value={String(overview.sites.filter((site) => !site.enabled).length)} tone="soft" />
          <KpiCard
            label="Подключённые источники"
            value={String(overview.sites.reduce((count, site) => count + site.enabledSourceCount, 0))}
          />
        </section>

        <SectionCard title="Сайты клиента" note="Отдельный отчёт на сайт">
          <div className="grid gap-3 lg:grid-cols-2">
            {overview.sites.map((site) => (
              <article key={site.siteSlug} className="rounded-[8px] border border-[var(--report-border)] bg-[var(--report-surface-muted)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--report-text)]">{site.name}</h2>
                    <p className="mt-1 text-sm text-[var(--report-text-secondary)]">
                      {site.enabled ? site.siteUrl : "Не подключён"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--report-border)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--report-text-muted)]">
                    {site.enabled
                      ? `${site.enabledSourceCount} ${
                          site.enabledSourceCount === 1 ? "источник" : "источника"
                        }`
                      : "Не подключён"}
                  </span>
                </div>
                <Link
                  href={`/c/${overview.client.clientSlug}/${site.siteSlug}/`}
                  className="mt-4 inline-flex rounded-xl bg-[var(--report-sidebar)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Открыть сайт
                </Link>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
