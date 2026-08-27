import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  clientRegistrySchema,
  clusterProfileSchema,
  goalProfileSchema,
  thresholdsSchema,
  type GoalProfile,
  type SiteRegistry,
} from "../../src/shared/schemas/registry";
import { type MetricaAllowedGoal } from "../../src/shared/schemas/metrica-source";

function normalizeSiteUrl(url: string) {
  const parsed = new URL(url);
  const normalizedPath = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
  return `${parsed.protocol.toLowerCase()}//${parsed.hostname.toLowerCase()}${normalizedPath}`;
}

async function readJsonDirectory<T>(dirPath: string, parse: (value: unknown) => T) {
  const entries = (await readdir(dirPath)).filter((entry) => entry.endsWith(".json")).sort();
  return Promise.all(entries.map(async (entry) => parse(JSON.parse(await readFile(path.join(dirPath, entry), "utf8")))));
}

export async function loadCollectorRegistry(cwd = process.cwd()) {
  const clientsDir = path.join(cwd, "config", "clients");
  const clustersDir = path.join(cwd, "config", "clusters");
  const goalsDir = path.join(cwd, "config", "goals");
  const clients = await readJsonDirectory(clientsDir, (value) =>
    clientRegistrySchema.parse(value),
  );
  const clusters = await readJsonDirectory(clustersDir, (value) =>
    clusterProfileSchema.parse(value),
  );
  const goals = await readJsonDirectory(goalsDir, (value) => goalProfileSchema.parse(value));
  const thresholds = thresholdsSchema.parse(
    JSON.parse(await readFile(path.join(cwd, "config", "thresholds.json"), "utf8")),
  );

  return { clients, clusters, goals, thresholds };
}

export async function findSiteConfigByUrl(targetSiteUrl: string, cwd = process.cwd()) {
  const { clients, goals } = await loadCollectorRegistry(cwd);
  const target = normalizeSiteUrl(targetSiteUrl);

  for (const client of clients) {
    for (const site of client.sites) {
      if (normalizeSiteUrl(site.siteUrl) !== target) {
        continue;
      }

      const goalProfile = goals.find((item) => item.clientSlug === client.clientSlug) ?? null;
      return {
        client,
        site,
        goalProfile,
      };
    }
  }

  return null;
}

export function getAllowedGoalsForSite(args: {
  site: SiteRegistry;
  goalProfile: GoalProfile | null;
}): MetricaAllowedGoal[] {
  const goals = args.goalProfile?.goals ?? [];
  return goals
    .filter((goal) => goal.siteSlugs.length === 0 || goal.siteSlugs.includes(args.site.siteSlug))
    .map((goal) => ({
      goalId: goal.goalId,
      label: goal.label,
      category: goal.category,
      direction: goal.direction,
    }));
}
