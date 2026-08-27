import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/shell/AppShell";
import { getSiteStaticParams, getSiteBySlugs, getClientBySlug } from "../../../../modules/client-registry/registry";
import { SiteReportView } from "../../../../modules/dashboards/SiteReportView";

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


  return (
    <AppShell currentPath={`/c/${clientSlug}/${siteSlug}/`}>
      <SiteReportView
        clientName={client.name}
        site={site}
        snapshot={null}
        mode="live"
      />
    </AppShell>
  );
}
