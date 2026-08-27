import REDACTED_CLIENT_DATAClient from "../../../config/clients/REDACTED_CLIENT_DATA.json";
import szRostovClient from "../../../config/clients/REDACTED_CLIENT_DATA.json";
import defaultCluster from "../../../config/clusters/default.json";
import realEstateCluster from "../../../config/clusters/real-estate.json";
import REDACTED_CLIENT_DATAGoals from "../../../config/goals/REDACTED_CLIENT_DATA.json";
import szRostovGoals from "../../../config/goals/REDACTED_CLIENT_DATA.json";
import thresholdsConfig from "../../../config/thresholds.json";
import {
  clientRegistrySchema,
  clusterProfileSchema,
  goalProfileSchema,
  isPlaceholderSiteUrl,
  thresholdsSchema,
  type ClientRegistry,
  type ClusterProfile,
  type GoalProfile,
  type SiteRegistry,
  type ThresholdsConfig,
} from "../../shared/schemas/registry";

export type RegistryBundle = {
  clients: ClientRegistry[];
  clusters: ClusterProfile[];
  goals: GoalProfile[];
  thresholds: ThresholdsConfig;
};

const parsedBundle = createRegistryBundle();

function createRegistryBundle(): RegistryBundle {
  const clients = [REDACTED_CLIENT_DATAClient, szRostovClient].map((item) => clientRegistrySchema.parse(item));
  const clusters = [defaultCluster, realEstateCluster].map((item) => clusterProfileSchema.parse(item));
  const goals = [REDACTED_CLIENT_DATAGoals, szRostovGoals].map((item) => goalProfileSchema.parse(item));
  const thresholds = thresholdsSchema.parse(thresholdsConfig);

  validateBundle({ clients, clusters, goals, thresholds });

  return { clients, clusters, goals, thresholds };
}

function validateBundle(bundle: RegistryBundle) {
  const clientSlugs = new Set<string>();
  const clusterSlugs = new Set(bundle.clusters.map((cluster) => cluster.profileSlug));
  const goalClientSlugs = new Set(bundle.goals.map((profile) => profile.clientSlug));
  const routePaths = new Set(["/analyst/"]);

  for (const client of bundle.clients) {
    if (clientSlugs.has(client.clientSlug)) {
      throw new Error(`Duplicate client slug: ${client.clientSlug}`);
    }

    clientSlugs.add(client.clientSlug);

    if (!clusterSlugs.has(client.clusterProfile)) {
      throw new Error(`Unknown cluster profile: ${client.clusterProfile}`);
    }

    if (!goalClientSlugs.has(client.clientSlug)) {
      throw new Error(`Missing goal profile file for client: ${client.clientSlug}`);
    }

    const clientRoute = `/c/${client.clientSlug}/`;
    assertUniqueRoute(routePaths, clientRoute);

    const siteSlugs = new Set<string>();

    for (const site of client.sites) {
      if (siteSlugs.has(site.siteSlug)) {
        throw new Error(`Duplicate site slug inside client ${client.clientSlug}: ${site.siteSlug}`);
      }

      siteSlugs.add(site.siteSlug);

      if (site.enabled && isPlaceholderSiteUrl(site.siteUrl)) {
        throw new Error(`Enabled site has placeholder URL: ${client.clientSlug}/${site.siteSlug}`);
      }

      const siteRoute = `/c/${client.clientSlug}/${site.siteSlug}/`;
      assertUniqueRoute(routePaths, siteRoute);
    }
  }
}

function assertUniqueRoute(routes: Set<string>, route: string) {
  if (routes.has(route)) {
    throw new Error(`Route collision: ${route}`);
  }

  routes.add(route);
}

export function getRegistryBundle() {
  return parsedBundle;
}

export function getClients() {
  return parsedBundle.clients;
}

export function getClientBySlug(clientSlug: string) {
  return parsedBundle.clients.find((client) => client.clientSlug === clientSlug) ?? null;
}

export function getSiteBySlugs(clientSlug: string, siteSlug: string) {
  const client = getClientBySlug(clientSlug);
  if (!client) {
    return null;
  }

  return client.sites.find((site) => site.siteSlug === siteSlug) ?? null;
}

export function getClientStaticParams() {
  return parsedBundle.clients.map((client) => ({ clientSlug: client.clientSlug }));
}

export function getSiteStaticParams() {
  return parsedBundle.clients.flatMap((client) =>
    client.sites.map((site) => ({ clientSlug: client.clientSlug, siteSlug: site.siteSlug })),
  );
}

export function getApprovedRoutes() {
  const routes = ["/", "/demo/", "/analyst/"];
  for (const client of parsedBundle.clients) {
    routes.push(`/c/${client.clientSlug}/`);
    for (const site of client.sites) {
      routes.push(`/c/${client.clientSlug}/${site.siteSlug}/`);
    }
  }
  return routes;
}

export function getGoalProfileForClient(clientSlug: string) {
  return parsedBundle.goals.find((goalProfile) => goalProfile.clientSlug === clientSlug) ?? null;
}

export function hasConnectedSite(client: ClientRegistry) {
  return client.sites.some((site) => site.enabled);
}

export function getConnectedSites(client: ClientRegistry): SiteRegistry[] {
  return client.sites.filter((site) => site.enabled);
}
