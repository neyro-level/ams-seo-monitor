import "server-only";

import { PrismaAccessGrantRepository } from "../modules/identity-access/index.ts";
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
import { AuthorizationService } from "../platform/authorization/authorization-service.ts";
import { getPrismaClient } from "../platform/database/prisma/client.ts";

function createServices() {
  const projectRepository = new PrismaProjectRepository();
  const authorizationService = new AuthorizationService(new PrismaAccessGrantRepository(getPrismaClient()));
  const projectService = new ProjectService(projectRepository, authorizationService);
  return {
    projectService,
    authorizationService,
    analystService: new AnalystService(projectService),
    siteService: new SiteService(projectService),
    monitoringService: new MonitoringService(new PrismaMonitoringRepository()),
    reportService: new ReportService(projectService, new PrismaReportRepository()),
    reliabilityService: new ReliabilityService(new PrismaReliabilityRepository()),
  };
}

let services: ReturnType<typeof createServices> | null = null;
function getServices() {
  services ??= createServices();
  return services;
}

export function getProjectService() {
  return getServices().projectService;
}

export function getAuthorizationService() {
  return getServices().authorizationService;
}

export function getAnalystService() {
  return getServices().analystService;
}

export function getSiteService() {
  return getServices().siteService;
}

export function getMonitoringService() {
  return getServices().monitoringService;
}

export function getReportService() {
  return getServices().reportService;
}

export function getReliabilityService() {
  return getServices().reliabilityService;
}
