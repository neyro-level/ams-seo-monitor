export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { KpiCard } from "../../components/dashboard/KpiCard.tsx";
import { PageHeader } from "../../components/dashboard/PageHeader.tsx";
import { SectionCard } from "../../components/dashboard/SectionCard.tsx";
import { ButtonLink } from "../../components/ui/button-link.tsx";
import {
  getCurrentCabinetRedirect,
  getCurrentPrincipalState,
} from "../../modules/identity-access/server.ts";
import { buildAnalystOverview } from "../../modules/project-registry/presentation.ts";
import { hasPermission } from "../../platform/authorization/principal.ts";

export default async function DashboardPage() {
  const cabinetRedirect = await getCurrentCabinetRedirect();
  if (cabinetRedirect) redirect(cabinetRedirect);
  const state = await getCurrentPrincipalState();
  if (!state) redirect("/?login=1");

  const overview = await buildAnalystOverview(state.principal);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Обзор"
          description="Общее состояние проектов, сайтов и подключённых источников данных."
          actions={
            hasPermission(state.principal, "project:read:any") ? (
              <ButtonLink
                href="/analyst/"
                className="w-full sm:w-auto"
              >
                Все проекты
              </ButtonLink>
            ) : null
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Проекты" value={String(overview.totalProjects)} tone="primary" />
          <KpiCard label="Маршруты сайтов" value={String(overview.totalSites)} />
          <KpiCard label="Подключённые" value={String(overview.connectedSites)} />
          <KpiCard label="Плановые" value={String(overview.plannedSites)} tone="soft" />
        </section>

        <SectionCard title="Состояние системы" note="Работает штатно">
          <ul className="grid gap-3 text-sm text-app-secondary md:grid-cols-2">
            <li className="rounded-[var(--radius-panel)] bg-[var(--muted)] p-4">Доступ к данным определяется ролью пользователя и выбранной организацией.</li>
            <li className="rounded-[var(--radius-panel)] bg-[var(--muted)] p-4">Данные поступают из Яндекс.Вебмастера, Метрики и сервиса проверки позиций.</li>
            <li className="rounded-[var(--radius-panel)] bg-[var(--muted)] p-4">Отчёты хранятся в единой базе и обновляются фоновыми заданиями.</li>
            <li className="rounded-[var(--radius-panel)] bg-[var(--muted)] p-4">Показатели подготовлены для безопасного просмотра в личном кабинете.</li>
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
