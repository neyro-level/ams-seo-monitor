import "server-only";

import { AnalystService } from "../application/services/analyst-service";
import { MonitoringService } from "../application/services/monitoring-service";
import { ProjectService } from "../application/services/project-service";
import { ReportService } from "../application/services/report-service";
import { SiteService } from "../application/services/site-service";
import { PrismaMonitoringRepository } from "./database/repositories/prisma-monitoring-repository";
import { PrismaProjectRepository } from "./database/repositories/prisma-project-repository";
import { PrismaReportRepository } from "./database/repositories/prisma-report-repository";

const projectRepository = new PrismaProjectRepository();
const monitoringRepository = new PrismaMonitoringRepository();
const reportRepository = new PrismaReportRepository();

const projectService = new ProjectService(projectRepository);
const analystService = new AnalystService(projectService);
const siteService = new SiteService(projectService);
const monitoringService = new MonitoringService(monitoringRepository);
const reportService = new ReportService(projectService, reportRepository);
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

