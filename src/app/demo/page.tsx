export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "../../components/shell/AppShell";
import { SiteReportView } from "../../modules/dashboards/SiteReportView";
import { getDemoSnapshot } from "../../modules/report-data/demo-data";
import { getCurrentAuthenticatedUser } from "../../infrastructure/auth/session";
import { siteRegistrySchema } from "../../shared/schemas/registry";

const demoSite = siteRegistrySchema.parse({
  siteSlug: "overview",
  name: "Synthetic overview",
  siteUrl: "https://demo.ams-cloud.ru",
  timezone: "+03:00",
  enabled: true,
  webmaster: {
    enabled: true,
    expectedHostUrl: "https://demo.ams-cloud.ru",
  },
  metrica: {
    enabled: true,
    counterId: "100001",
    goalProfile: "default",
  },
});

export default async function DemoPage() {
  const user = await getCurrentAuthenticatedUser();
  if (!user) {
    redirect("/?login=1");
  }

  return (
    <AppShell currentPath="/demo/" user={user}>
      <SiteReportView
        clientName="Demo"
        site={demoSite}
        snapshot={getDemoSnapshot()}
        mode="fixture"
      />
    </AppShell>
  );
}
