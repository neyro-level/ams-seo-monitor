export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "../../components/shell/AppShell.tsx";
import { SiteReportView } from "../../modules/reporting/presentation.ts";
import { getDemoSnapshot } from "../../modules/reporting/presentation.ts";
import { getCurrentActorContext } from "../../modules/identity-access/server.ts";
import { siteRegistrySchema } from "../../shared/schemas/registry.ts";

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
  const user = await getCurrentActorContext();
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
