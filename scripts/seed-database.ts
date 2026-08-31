import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GoalCategory,
  GoalDirection,
  ProjectStatus,
  Provider,
  RankingSource,
} from "@prisma/client";
import {
  clientRegistrySchema,
  clusterProfileSchema,
  goalProfileSchema,
  thresholdsSchema,
  type ClientRegistry,
} from "../src/shared/schemas/registry";
import { createPrismaContext } from "../src/infrastructure/database/prisma/context";
import { trackedQuerySetSchema } from "../src/shared/schemas/tracked-query";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const database = createPrismaContext({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_PORT: process.env.DATABASE_PORT,
  DATABASE_USER: process.env.DATABASE_USER,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
  DATABASE_NAME: process.env.DATABASE_NAME,
  DATABASE_SSLMODE: process.env.DATABASE_SSLMODE,
});
const { prisma } = database;

function projectStatusForClient(client: ClientRegistry) {
  if (!client.enabled) return ProjectStatus.DISABLED;
  return client.sites.some((site) => site.enabled) ? ProjectStatus.ACTIVE : ProjectStatus.PLANNED;
}

function goalCategoryToEnum(category: string) {
  switch (category) {
    case "lead_submit":
      return GoalCategory.LEAD_SUBMIT;
    case "phone_click":
      return GoalCategory.PHONE_CLICK;
    case "messenger_click":
      return GoalCategory.MESSENGER_CLICK;
    case "form_start":
      return GoalCategory.FORM_START;
    case "file_download":
      return GoalCategory.FILE_DOWNLOAD;
    default:
      return GoalCategory.OTHER;
  }
}

function goalDirectionToEnum(direction: string) {
  return direction === "primary" ? GoalDirection.PRIMARY : GoalDirection.SECONDARY;
}

function normalizeTrackedQuery(query: string) {
  return query.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();
}

async function readJsonDirectory<T>(relativeDir: string, schema: { parse: (value: unknown) => T }) {
  const fullDir = path.join(rootDir, relativeDir);
  const names = (await readdir(fullDir)).filter((name) => name.endsWith(".json")).sort();
  const items: T[] = [];
  for (const name of names) {
    const payload = JSON.parse(await readFile(path.join(fullDir, name), "utf8"));
    items.push(schema.parse(payload));
  }
  return items;
}

async function main() {
  const thresholds = thresholdsSchema.parse(
    JSON.parse(await readFile(path.join(rootDir, "config", "thresholds.json"), "utf8")),
  );
  const clusterProfiles = await readJsonDirectory("config/clusters", clusterProfileSchema);
  const clientConfigs = await readJsonDirectory("config/clients", clientRegistrySchema);
  const goalProfiles = await readJsonDirectory("config/goals", goalProfileSchema);
  const trackedQuerySets = await readJsonDirectory("config/tracked-queries", trackedQuerySetSchema);

  const thresholdProfile = await prisma.thresholdProfile.upsert({
    where: { slug: "default" },
    update: {
      minimumShows: thresholds.queryOpportunity.minimumShows,
      maximumCtrPercent: thresholds.queryOpportunity.maximumCtrPercent.toString(),
      maximumAveragePosition: thresholds.queryOpportunity.maximumAveragePosition.toString(),
      showsDropPercent: thresholds.trendAlerts.showsDropPercent.toString(),
      clicksDropPercent: thresholds.trendAlerts.clicksDropPercent.toString(),
      positionWorsenedDelta: thresholds.trendAlerts.positionWorsenedDelta.toString(),
      pagesInSearchDropPercent: thresholds.trendAlerts.pagesInSearchDropPercent.toString(),
      organicVisitsDropPercent: thresholds.trendAlerts.organicVisitsDropPercent.toString(),
      goalConversionDropPercent: thresholds.trendAlerts.goalConversionDropPercent.toString(),
    },
    create: {
      slug: "default",
      minimumShows: thresholds.queryOpportunity.minimumShows,
      maximumCtrPercent: thresholds.queryOpportunity.maximumCtrPercent.toString(),
      maximumAveragePosition: thresholds.queryOpportunity.maximumAveragePosition.toString(),
      showsDropPercent: thresholds.trendAlerts.showsDropPercent.toString(),
      clicksDropPercent: thresholds.trendAlerts.clicksDropPercent.toString(),
      positionWorsenedDelta: thresholds.trendAlerts.positionWorsenedDelta.toString(),
      pagesInSearchDropPercent: thresholds.trendAlerts.pagesInSearchDropPercent.toString(),
      organicVisitsDropPercent: thresholds.trendAlerts.organicVisitsDropPercent.toString(),
      goalConversionDropPercent: thresholds.trendAlerts.goalConversionDropPercent.toString(),
    },
  });

  for (const profile of clusterProfiles) {
    const clusterProfile = await prisma.queryClusterProfile.upsert({
      where: { slug: profile.profileSlug },
      update: { name: profile.name },
      create: {
        slug: profile.profileSlug,
        name: profile.name,
      },
    });

    const incomingSlugs = profile.groups.map((group) => group.slug);
    await prisma.queryClusterGroup.deleteMany({
      where: {
        profileId: clusterProfile.id,
        slug: { notIn: incomingSlugs },
      },
    });

    for (const [index, group] of profile.groups.entries()) {
      await prisma.queryClusterGroup.upsert({
        where: {
          profileId_slug: {
            profileId: clusterProfile.id,
            slug: group.slug,
          },
        },
        update: {
          label: group.label,
          order: index,
          brandTermsJson: profile.brandTerms,
          termsJson: group.terms,
        },
        create: {
          profileId: clusterProfile.id,
          slug: group.slug,
          label: group.label,
          order: index,
          brandTermsJson: profile.brandTerms,
          termsJson: group.terms,
        },
      });
    }
  }

  for (const client of clientConfigs) {
    const clusterProfile = await prisma.queryClusterProfile.findUniqueOrThrow({
      where: { slug: client.clusterProfile },
    });
    const goalProfile = goalProfiles.find((item) => item.clientSlug === client.clientSlug) ?? null;

    const organization = await prisma.organization.upsert({
      where: { slug: client.clientSlug },
      update: { name: client.name },
      create: {
        slug: client.clientSlug,
        name: client.name,
      },
    });

    const project = await prisma.project.upsert({
      where: { slug: client.clientSlug },
      update: {
        name: client.name,
        status: projectStatusForClient(client),
        organizationId: organization.id,
        thresholdProfileId: thresholdProfile.id,
        clusterProfileId: clusterProfile.id,
      },
      create: {
        slug: client.clientSlug,
        name: client.name,
        status: projectStatusForClient(client),
        organizationId: organization.id,
        thresholdProfileId: thresholdProfile.id,
        clusterProfileId: clusterProfile.id,
      },
    });

    const siteIdsBySlug: Record<string, string> = {};

    for (const site of client.sites) {
      const siteRecord = await prisma.site.upsert({
        where: {
          projectId_slug: {
            projectId: project.id,
            slug: site.siteSlug,
          },
        },
        update: {
          name: site.name,
          url: site.siteUrl,
          timezone: site.timezone,
          enabled: site.enabled,
        },
        create: {
          projectId: project.id,
          slug: site.siteSlug,
          name: site.name,
          url: site.siteUrl,
          timezone: site.timezone,
          enabled: site.enabled,
        },
      });

      siteIdsBySlug[site.siteSlug] = siteRecord.id;

      const providerRows = [
        {
          provider: Provider.YANDEX_WEBMASTER,
          externalId: site.webmaster.expectedHostUrl,
          enabled: site.webmaster.enabled,
          settingsJson: { expectedHostUrl: site.webmaster.expectedHostUrl },
        },
        {
          provider: Provider.YANDEX_METRIKA,
          externalId: site.metrica.counterId,
          enabled: site.metrica.enabled,
          settingsJson: { goalProfile: site.metrica.goalProfile },
        },
        {
          provider: Provider.TOPVISOR,
          externalId: site.topvisor.projectId === null ? null : String(site.topvisor.projectId),
          enabled: site.topvisor.enabled,
          settingsJson: { regionIndex: site.topvisor.regionIndex },
        },
      ];

      for (const row of providerRows) {
        await prisma.providerConnection.upsert({
          where: {
            siteId_provider: {
              siteId: siteRecord.id,
              provider: row.provider,
            },
          },
          update: {
            externalId: row.externalId,
            enabled: row.enabled,
            settingsJson: row.settingsJson,
          },
          create: {
            siteId: siteRecord.id,
            provider: row.provider,
            externalId: row.externalId,
            enabled: row.enabled,
            settingsJson: row.settingsJson,
          },
        });
      }
    }

    if (goalProfile) {
      const incomingGoalIds = goalProfile.goals.map((goal) => goal.goalId);
      await prisma.goalDefinition.deleteMany({
        where: {
          projectId: project.id,
          externalGoalId: { notIn: incomingGoalIds },
        },
      });

      for (const goal of goalProfile.goals) {
        const goalRecord = await prisma.goalDefinition.upsert({
          where: {
            projectId_externalGoalId: {
              projectId: project.id,
              externalGoalId: goal.goalId,
            },
          },
          update: {
            label: goal.label,
            category: goalCategoryToEnum(goal.category),
            direction: goalDirectionToEnum(goal.direction),
            includeInSeoConversion: goal.includeInSeoConversion,
          },
          create: {
            projectId: project.id,
            externalGoalId: goal.goalId,
            label: goal.label,
            category: goalCategoryToEnum(goal.category),
            direction: goalDirectionToEnum(goal.direction),
            includeInSeoConversion: goal.includeInSeoConversion,
          },
        });

        await prisma.goalDefinitionSite.deleteMany({
          where: { goalDefinitionId: goalRecord.id },
        });

        for (const siteSlug of goal.siteSlugs) {
          const siteId = siteIdsBySlug[siteSlug];
          if (!siteId) {
            throw new Error(`Unknown site slug in goal scope: ${client.clientSlug}/${siteSlug}`);
          }
          await prisma.goalDefinitionSite.create({
            data: {
              goalDefinitionId: goalRecord.id,
              siteId,
            },
          });
        }
      }
    }

    const trackedQuerySet = trackedQuerySets.find(
      (item) => item.clientSlug === client.clientSlug,
    );

    if (trackedQuerySet) {
      const siteId = siteIdsBySlug[trackedQuerySet.siteSlug];
      if (!siteId) {
        throw new Error(`Unknown tracked-query site: ${trackedQuerySet.clientSlug}/${trackedQuerySet.siteSlug}`);
      }

      const trackedSetRecord = await prisma.trackedQuerySet.upsert({
        where: { siteId },
        update: {
          source: RankingSource.OWNER_PROVIDED,
          baselineLabel: trackedQuerySet.baselineLabel,
          expectedCount: trackedQuerySet.expectedCount,
        },
        create: {
          siteId,
          source: RankingSource.OWNER_PROVIDED,
          baselineLabel: trackedQuerySet.baselineLabel,
          expectedCount: trackedQuerySet.expectedCount,
        },
      });

      const incomingQueries = trackedQuerySet.queries.map((query) => normalizeTrackedQuery(query.query));
      await prisma.trackedQuery.deleteMany({
        where: {
          trackedQuerySetId: trackedSetRecord.id,
          normalizedQuery: { notIn: incomingQueries },
        },
      });

      for (const query of trackedQuerySet.queries) {
        const normalizedQuery = normalizeTrackedQuery(query.query);
        await prisma.trackedQuery.upsert({
          where: {
            trackedQuerySetId_normalizedQuery: {
              trackedQuerySetId: trackedSetRecord.id,
              normalizedQuery,
            },
          },
          update: {
            query: query.query,
            enabled: true,
            baselineCurrentPosition: query.position.current,
            baselinePreviousPosition: query.position.baseline,
          },
          create: {
            trackedQuerySetId: trackedSetRecord.id,
            query: query.query,
            normalizedQuery,
            enabled: true,
            baselineCurrentPosition: query.position.current,
            baselinePreviousPosition: query.position.baseline,
          },
        });
      }
    }
  }

  const projectCount = await prisma.project.count();
  const siteCount = await prisma.site.count();
  const trackedQueryCount = await prisma.trackedQuery.count();
  console.log(JSON.stringify({ projectCount, siteCount, trackedQueryCount }, null, 2));
}

main()
  .finally(async () => {
    await database.close();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
