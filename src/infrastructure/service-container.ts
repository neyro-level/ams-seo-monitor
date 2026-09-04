import "server-only";

import { AdminCmsService } from "../modules/admin-cms/index.ts";
import { PrismaAdminRepository } from "../modules/admin-cms/server.ts";
import {
  AnalystService,
  MonitoringService,
  ProjectService,
  SiteService,
} from "../modules/project-registry/index.ts";
import { ReliabilityService } from "../modules/platform-operations/index.ts";
import { ReportService } from "../modules/reporting/index.ts";
import {
  PrismaMonitoringRepository,
  PrismaProjectRepository,
} from "../modules/project-registry/server.ts";
import { PrismaReliabilityRepository } from "../modules/platform-operations/server.ts";
import { PrismaReportRepository } from "../modules/reporting/server.ts";

const projectRepository = new PrismaProjectRepository();
const monitoringRepository = new PrismaMonitoringRepository();
const reportRepository = new PrismaReportRepository();
const reliabilityRepository = new PrismaReliabilityRepository();
const adminRepository = new PrismaAdminRepository();

const projectService = new ProjectService(projectRepository);
const analystService = new AnalystService(projectService);
const siteService = new SiteService(projectService);
const monitoringService = new MonitoringService(monitoringRepository);
const reportService = new ReportService(projectService, reportRepository);
const reliabilityService = new ReliabilityService(reliabilityRepository);
const adminCmsService = new AdminCmsService(adminRepository);
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

export function getAdminCmsService() {
  return adminCmsService;
}

