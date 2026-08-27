import { getClientBySlug, getClients } from "../client-registry/registry";


export function buildAnalystOverview() {
  const clients = getClients();
  const totalSites = clients.reduce((count, client) => count + client.sites.length, 0);
  const connectedSites = clients.reduce(
    (count, client) => count + client.sites.filter((site) => site.enabled).length,
    0,
  );
  const plannedSites = totalSites - connectedSites;
  const enabledSources = clients.reduce(
    (count, client) =>
      count +
      client.sites.reduce(
        (siteCount, site) =>
          siteCount + Number(site.webmaster.enabled) + Number(site.metrica.enabled),
        0,
      ),
    0,
  );

  return {
    totalClients: clients.length,
    totalSites,
    connectedSites,
    plannedSites,
    enabledSources,
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
    enabledSourceCount: Number(site.webmaster.enabled) + Number(site.metrica.enabled),
  }));

  return {
    client,
    sites,
  };
}
