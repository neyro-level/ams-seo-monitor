import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/shell/AppShell";
import { getSiteStaticParams, getSiteBySlugs, getClientBySlug } from "../../../../modules/client-registry/registry";
import { SiteReportView } from "../../../../modules/dashboards/SiteReportView";
import { getFixtureSnapshot } from "../../../../modules/report-data/demo-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSiteStaticParams();
}

type SiteReportPageProps = {
  params: Promise<{
    clientSlug: string;
    siteSlug: string;
  }>;
};

export default async function SiteReportPage({ params }: SiteReportPageProps) {
  const { clientSlug, siteSlug } = await params;
  const client = getClientBySlug(clientSlug);
  const site = getSiteBySlugs(clientSlug, siteSlug);

  if (!client || !site) {
    notFound();
  }

  const snapshot = getFixtureSnapshot(clientSlug, siteSlug);

  return (
    <AppShell currentPath={`/c/${clientSlug}/${siteSlug}/`}>
      <SiteReportView
        clientName={client.name}
        site={site}
        snapshot={snapshot}
        mode={snapshot ? "fixture" : "planned"}
      />
    </AppShell>
  );
}
