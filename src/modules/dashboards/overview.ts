import { getFixtureSnapshot } from "../report-data/demo-data";
import { getClientBySlug, getClients } from "../client-registry/registry";

export function buildAnalystOverview() {
  const clients = getClients();
  const totalSites = clients.reduce((count, client) => count + client.sites.length, 0);
  const connectedSites = clients.reduce(
    (count, client) => count + client.sites.filter((site) => site.enabled).length,
    0,
  );
  const plannedSites = totalSites - connectedSites;
  const reports = clients.flatMap((client) =>
    client.sites.map((site) => ({ client, site, snapshot: getFixtureSnapshot(client.clientSlug, site.siteSlug) })),
  );
  const activeSnapshots = reports.filter((item) => item.snapshot !== null).length;

  return {
    totalClients: clients.length,
    totalSites,
    connectedSites,
    plannedSites,
    activeSnapshots,
    latestSyntheticUpdate:
      reports.find((item) => item.snapshot)?.snapshot?.generatedAt ?? "Fixture not available",
    clientCards: clients.map((client) => ({
      clientSlug: client.clientSlug,
      name: client.name,
      totalSites: client.sites.length,
      connectedSites: client.sites.filter((site) => site.enabled).length,
      plannedSites: client.sites.filter((site) => !site.enabled).length,
    })),
  };
}

export function buildClientOverview(clientSlug: string) {
  const client = getClientBySlug(clientSlug);
  if (!client) {
    return null;
  }

  const sites = client.sites.map((site) => ({
    ...site,
    snapshot: getFixtureSnapshot(client.clientSlug, site.siteSlug),
  }));

  return {
    client,
    sites,
    latestSyntheticUpdate: sites.find((site) => site.snapshot)?.snapshot?.generatedAt ?? null,
  };
}
