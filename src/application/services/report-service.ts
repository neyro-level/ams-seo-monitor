import type { ReportRepository } from "../ports/report-repository";
import type { ProjectRepository } from "../ports/project-repository";
import type { ReportPeriodKey, SiteReportSnapshot } from "../../shared/schemas/report";
import type { AuthenticatedUser } from "../../infrastructure/auth/types";
import { ProjectService } from "./project-service";

export class ReportService {
  private readonly projectService: ProjectService;

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly reportRepository: ReportRepository,
  ) {
    this.projectService = new ProjectService(projectRepository);
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
}
