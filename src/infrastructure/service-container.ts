import "server-only";

import {
  AnalystService,
  MonitoringService,
  ProjectService,
  SiteService,
} from "../modules/project-registry";
import { ReliabilityService } from "../modules/platform-operations";
import { ReportService } from "../modules/reporting";
import {
  PrismaMonitoringRepository,
  PrismaProjectRepository,
} from "../modules/project-registry/server";
import { PrismaReliabilityRepository } from "../modules/platform-operations/server";
import { PrismaReportRepository } from "../modules/reporting/server";

const projectRepository = new PrismaProjectRepository();
const monitoringRepository = new PrismaMonitoringRepository();
const reportRepository = new PrismaReportRepository();
const reliabilityRepository = new PrismaReliabilityRepository();

const projectService = new ProjectService(projectRepository);
const analystService = new AnalystService(projectService);
const siteService = new SiteService(projectService);
const monitoringService = new MonitoringService(monitoringRepository);
const reportService = new ReportService(projectService, reportRepository);
const reliabilityService = new ReliabilityService(reliabilityRepository);
export function getProjectService() {
  return projectService;
}

export function getAnalystService() {
  return analystService;
}

export function getSiteService() {
  return siteService;
}

export function getMonitoringService() {
  return monitoringService;
}

export function getReportService() {
  return reportService;
}

export function getReliabilityService() {
  return reliabilityService;
}

