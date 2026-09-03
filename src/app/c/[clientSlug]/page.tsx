export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "../../../components/shell/AppShell.tsx";
import { KpiCard } from "../../../components/dashboard/KpiCard.tsx";
import { PageHeader } from "../../../components/dashboard/PageHeader.tsx";
import { SectionCard } from "../../../components/dashboard/SectionCard.tsx";
import { StatusBanner } from "../../../components/dashboard/StatusBanner.tsx";
import { getCurrentActorContext } from "../../../modules/identity-access/server.ts";
import { buildClientOverview } from "../../../modules/project-registry/presentation.ts";

type ClientOverviewPageProps = {
  params: Promise<{
    clientSlug: string;
  }>;
};

export default async function ClientOverviewPage({ params }: ClientOverviewPageProps) {
  const user = await getCurrentActorContext();
  if (!user) {
    redirect("/?login=1");
  }

  const { clientSlug } = await params;
  const overview = await buildClientOverview(user, clientSlug);

  if (!overview) {
    notFound();
  }

  const connectedSites = overview.sites.filter((site) => site.enabled).length;
  const readySites = overview.sites.filter(
    (site) => site.enabled && site.enabledSourceCount >= 2,
  ).length;
  const projectReady = connectedSites > 0 && readySites === connectedSites;

  return (
    <AppShell currentPath={`/c/${overview.client.clientSlug}/`} user={user}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Проект"
          title={`Проект ${overview.client.name}`}
          description="Сайты проекта, подключённые источники и переходы к отдельным отчётам."
        />

        <StatusBanner
          tone={projectReady ? "success" : "info"}
          title={projectReady ? "Источники подключены" : "Проект в настройке"}
          description={
            projectReady
              ? "Для всех подключённых сайтов настроены Яндекс.Вебмастер и Яндекс.Метрика."
              : "Подключайте сайты и источники по мере готовности; плановые сайты остаются видимыми."
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Всего сайтов" value={String(overview.sites.length)} tone="primary" />
          <KpiCard label="Подключённые" value={String(connectedSites)} />
          <KpiCard
            label="Плановые"
            value={String(overview.sites.filter((site) => !site.enabled).length)}
            tone="soft"
          />
          <KpiCard
            label="Подключённые источники"
            value={String(overview.sites.reduce((count, site) => count + site.enabledSourceCount, 0))}
          />
        </section>

        <SectionCard title="Сайты проекта" note="Отдельный отчёт на сайт">
          <div className="grid gap-3 lg:grid-cols-2">
            {overview.sites.map((site) => (
              <article
                key={site.siteSlug}
                className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-muted)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--crm-text)]">{site.name}</h2>
                    <p className="mt-1 text-sm text-[var(--crm-text-secondary)]">
                      {site.enabled ? site.siteUrl : "Не подключён"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--crm-border)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--crm-text-muted)]">
                    {site.enabled
                      ? `${site.enabledSourceCount} ${
                          site.enabledSourceCount === 1 ? "источник" : "источника"
                        }`
                      : "Не подключён"}
                  </span>
                </div>
                <Link
                  href={`/c/${overview.client.clientSlug}/${site.siteSlug}/`}
                  className="mt-4 inline-flex rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-semibold text-white"
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
