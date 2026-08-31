import { MonitoringService } from "../application/services/monitoring-service";
import { ProjectService } from "../application/services/project-service";
import { ReportService } from "../application/services/report-service";
import { SyncService } from "../application/services/sync-service";
import { PrismaMonitoringRepository } from "./database/repositories/prisma-monitoring-repository";
import { PrismaProjectRepository } from "./database/repositories/prisma-project-repository";
import { PrismaReportRepository } from "./database/repositories/prisma-report-repository";
import { PrismaSyncRepository } from "./database/repositories/prisma-sync-repository";
import { JsonLineSyncLogger } from "./logging/json-line-sync-logger";

const projectRepository = new PrismaProjectRepository();
const monitoringRepository = new PrismaMonitoringRepository();
const reportRepository = new PrismaReportRepository();
const syncRepository = new PrismaSyncRepository();

const projectService = new ProjectService(projectRepository);
const monitoringService = new MonitoringService(monitoringRepository);
const reportService = new ReportService(projectService, reportRepository);
const syncService = new SyncService({
  monitoringService,
  projectService,
  reportService,
  syncRepository,
  logger: new JsonLineSyncLogger(),
});

export function getWorkerSyncService() {
  return syncService;
}
