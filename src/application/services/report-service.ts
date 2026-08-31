import type { ProjectRepository } from "../ports/project-repository";
import type { ReportRepository, StoredReportSnapshotRecord } from "../ports/report-repository";
import type { ReportPeriodKey, SiteReportSnapshot } from "../../shared/schemas/report";
import type { AuthenticatedUser } from "../ports/authenticated-user";
import { ProjectService } from "./project-service";

export class ReportService {
  private readonly projectService: ProjectService;

  constructor(
    projectServiceOrRepository: ProjectService | ProjectRepository,
    private readonly reportRepository: ReportRepository,
  ) {
    this.projectService =
      projectServiceOrRepository instanceof ProjectService
        ? projectServiceOrRepository
        : new ProjectService(projectServiceOrRepository);
  }

  async getSiteReportForUser(
    user: AuthenticatedUser,
    projectSlug: string,
    siteSlug: string,
    periodKey: ReportPeriodKey,
  ): Promise<SiteReportSnapshot | null> {
    const site = await this.projectService.getSiteAccessForUser(user, projectSlug, siteSlug);
    if (!site) {
      return null;
    }

    const report = await this.reportRepository.findLatestReportSnapshot(site.siteId, periodKey);
    return report?.payload ?? null;
  }

  async getLatestReportSnapshotForSite(
    siteId: string,
    periodKey: ReportPeriodKey,
  ): Promise<StoredReportSnapshotRecord | null> {
    return this.reportRepository.findLatestReportSnapshot(siteId, periodKey);
  }
}
