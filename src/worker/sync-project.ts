import type { SiteSourceCollectors } from "../application/ports/provider-collectors";
import type { CreateSyncRunInput } from "../application/ports/sync-repository";
import { createLiveSiteCollectors } from "../../collector/orchestration/live-collectors";
import type { ReportPeriodKey, SiteReportSnapshot } from "../shared/schemas/report";
import { getWorkerSyncService } from "../infrastructure/worker-service-container";

export interface SyncProjectToDatabaseArgs {
  projectSlug: string;
  trigger?: CreateSyncRunInput["trigger"];
  env?: NodeJS.ProcessEnv;
  collectors?: SiteSourceCollectors;
  now?: () => string;
}

export interface SyncProjectPeriodResult {
  periodKey: ReportPeriodKey;
  freshness: SiteReportSnapshot["freshness"];
}

export interface SyncProjectSiteResult {
  siteSlug: string;
  status: "success" | "partial" | "failed";
  freshness: SiteReportSnapshot["freshness"];
  periods: SyncProjectPeriodResult[];
  safeErrorCodes: string[];
}

export interface SyncProjectToDatabaseResult {
  syncRunId: string;
  projectSlug: string;
  status: "success" | "partial" | "failed";
  sites: SyncProjectSiteResult[];
}

export async function syncProjectToDatabase(
  args: SyncProjectToDatabaseArgs,
): Promise<SyncProjectToDatabaseResult> {
  return getWorkerSyncService().syncProjectToDatabase({
    projectSlug: args.projectSlug,
    trigger: args.trigger ?? "manual",
    collectors: args.collectors ?? createLiveSiteCollectors(args.env),
    now: args.now,
  });
}
