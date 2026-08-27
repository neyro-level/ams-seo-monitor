import { AppShell } from "../../components/shell/AppShell";
import { SiteReportView } from "../../modules/dashboards/SiteReportView";
import { getDemoSnapshot } from "../../modules/report-data/demo-data";
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

export default function DemoPage() {
  return (
    <AppShell currentPath="/demo/">
      <SiteReportView
        clientName="Demo"
        site={demoSite}
        snapshot={getDemoSnapshot()}
        mode="fixture"
      />
    </AppShell>
  );
}
