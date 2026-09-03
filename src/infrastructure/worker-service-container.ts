import { SyncService } from "../modules/data-ingestion";
import {
  JsonLineSyncLogger,
  PrismaSyncRepository,
} from "../modules/data-ingestion/server";
import { ReliabilityService } from "../modules/platform-operations";
import { PrismaReliabilityRepository } from "../modules/platform-operations/server";
import {
  MonitoringService,
  ProjectService,
} from "../modules/project-registry";
import {
  PrismaMonitoringRepository,
  PrismaProjectRepository,
} from "../modules/project-registry/server";
import { ReportService } from "../modules/reporting";
import { PrismaReportRepository } from "../modules/reporting/server";

const projectRepository = new PrismaProjectRepository();
const monitoringRepository = new PrismaMonitoringRepository();
const reportRepository = new PrismaReportRepository();
const syncRepository = new PrismaSyncRepository();
const reliabilityRepository = new PrismaReliabilityRepository();

const projectService = new ProjectService(projectRepository);
const monitoringService = new MonitoringService(monitoringRepository);
const reportService = new ReportService(projectService, reportRepository);
const reliabilityService = new ReliabilityService(reliabilityRepository);
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

export function getWorkerReliabilityService() {
  return reliabilityService;
}
