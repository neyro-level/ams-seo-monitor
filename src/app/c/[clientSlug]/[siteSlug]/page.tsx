export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { ReportService } from "../../../../application/services/report-service";
import { MonitoringService } from "../../../../application/services/monitoring-service";
import { PrismaMonitoringRepository } from "../../../../infrastructure/database/repositories/prisma-monitoring-repository";
import { PrismaProjectRepository } from "../../../../infrastructure/database/repositories/prisma-project-repository";
import { PrismaReportRepository } from "../../../../infrastructure/database/repositories/prisma-report-repository";
import { AppShell } from "../../../../components/shell/AppShell";
import { ReportPeriodSelector } from "../../../../components/dashboard/ReportPeriodSelector";
import { SiteReportView } from "../../../../modules/dashboards/SiteReportView";
import { getCurrentAuthenticatedUser } from "../../../../infrastructure/auth/session";
import { reportPeriodKeySchema, type ReportPeriodKey } from "../../../../shared/schemas/report";

type SiteReportPageProps = {
  params: Promise<{
    clientSlug: string;
    siteSlug: string;
  }>;
  searchParams: Promise<{
    period?: string;
  }>;
};

function resolvePeriodKey(period: string | undefined): ReportPeriodKey {
  const parsedPeriod = reportPeriodKeySchema.safeParse(period);
  return parsedPeriod.success ? parsedPeriod.data : "month";
}

export default async function SiteReportPage({ params, searchParams }: SiteReportPageProps) {
  const user = await getCurrentAuthenticatedUser();
  if (!user) {
    redirect("/login/");
  }

  const { clientSlug, siteSlug } = await params;
  const { period } = await searchParams;
  const periodKey = resolvePeriodKey(period);
  const monitoringService = new MonitoringService(new PrismaMonitoringRepository());
  const reportService = new ReportService(
    new PrismaProjectRepository(),
    new PrismaReportRepository(),
  );
  const projectContext = await monitoringService.getProjectContext(clientSlug);
  const site = projectContext?.client.sites.find((item) => item.siteSlug === siteSlug) ?? null;
  const snapshot = await reportService.getSiteReportForUser(
    user,
    clientSlug,
    siteSlug,
    periodKey,
  );

  if (!projectContext || !site) {
    notFound();
  }

  return (
    <AppShell currentPath={`/c/${clientSlug}/${siteSlug}/`} user={user}>
      <SiteReportView
        clientName={`Проект ${projectContext.client.name}`}
        site={site}
        snapshot={snapshot}
        mode="live"
        backHref={`/c/${clientSlug}/`}
        periodControl={
          <ReportPeriodSelector
            active={periodKey}
            basePath={`/c/${clientSlug}/${siteSlug}/`}
          />
        }
      />
    </AppShell>
  );
}
