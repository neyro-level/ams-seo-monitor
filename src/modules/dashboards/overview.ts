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
    totalProjects: clients.length,
    totalSites,
    connectedSites,
    plannedSites,
    enabledSources,
    projectCards: clients.map((project) => {
      const projectEnabledSources = project.sites.reduce(
        (count, site) => count + Number(site.webmaster.enabled) + Number(site.metrica.enabled),
        0,
      );
      const readySites = project.sites.filter(
        (site) => site.enabled && site.webmaster.enabled && site.metrica.enabled,
      ).length;

      return {
        projectSlug: project.clientSlug,
        name: project.name,
        enabled: project.enabled,
        totalSites: project.sites.length,
        connectedSites: project.sites.filter((site) => site.enabled).length,
        plannedSites: project.sites.filter((site) => !site.enabled).length,
        enabledSources: projectEnabledSources,
        readySites,
      };
    }),
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
