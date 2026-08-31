export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { AppShell } from "../../../../components/shell/AppShell";
import { ReportPeriodSelector } from "../../../../components/dashboard/ReportPeriodSelector";
import { SiteReportView } from "../../../../modules/dashboards/SiteReportView";
import { getCurrentAuthenticatedUser } from "../../../../infrastructure/auth/session";
import {
  getMonitoringService,
  getProjectService,
  getReportService,
} from "../../../../infrastructure/service-container";
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
  const projectService = getProjectService();
  const reportService = getReportService();
  const monitoringService = getMonitoringService();

  const authorizedSite = await projectService.getSiteAccessForUser(user, clientSlug, siteSlug);
  if (!authorizedSite) {
    notFound();
  }

  const [projectContext, snapshot] = await Promise.all([
    monitoringService.getProjectContext(clientSlug),
    reportService.getSiteReportForUser(user, clientSlug, siteSlug, periodKey),
  ]);
  const site = projectContext?.client.sites.find((item) => item.siteSlug === siteSlug) ?? null;

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
