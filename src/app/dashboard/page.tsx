export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/shell/AppShell.tsx";
import { KpiCard } from "../../components/dashboard/KpiCard.tsx";
import { PageHeader } from "../../components/dashboard/PageHeader.tsx";
import { SectionCard } from "../../components/dashboard/SectionCard.tsx";
import { getCurrentActorContext } from "../../modules/identity-access/server.ts";
import { buildAnalystOverview } from "../../modules/project-registry/presentation.ts";
import { hasPermission } from "../../modules/identity-access/index.ts";

export default async function DashboardPage() {
  const user = await getCurrentActorContext();
  if (!user) {
    redirect("/?login=1");
  }

  const overview = await buildAnalystOverview(user);

  return (
    <AppShell currentPath="/dashboard/" user={user}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="АМС"
          title="AMS IMPULSE"
          description="Приватный SEO-кабинет: проекты, сайты, Яндекс.Вебмастер, Метрика и управленческие отчёты."
          actions={
            hasPermission(user, "project:read:any") ? (
              <Link
                href="/analyst/"
                className="rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Все проекты
              </Link>
            ) : null
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Проекты" value={String(overview.totalProjects)} tone="primary" />
          <KpiCard label="Маршруты сайтов" value={String(overview.totalSites)} />
          <KpiCard label="Подключённые" value={String(overview.connectedSites)} />
          <KpiCard label="Плановые" value={String(overview.plannedSites)} tone="soft" />
        </section>

        <SectionCard title="Текущий контур" note="Production runtime active">
          <ul className="grid gap-3 text-sm text-[var(--crm-text-secondary)] md:grid-cols-2">
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Авторизация работает через Better Auth и organization membership.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Webmaster, Metrica и Topvisor остаются read-only provider adapters.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">Runtime уже работает как Next.js server + PostgreSQL + Worker behind Nginx.</li>
            <li className="rounded-2xl bg-[var(--crm-surface-muted)] p-4">SiteReportSnapshot и SEO semantics остаются browser-safe контрактом отчёта.</li>
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
