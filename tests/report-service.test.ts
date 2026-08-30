import { describe, expect, it } from "vitest";
import { ReportService } from "../src/application/services/report-service";
import type {
  ProjectRepository,
  StoredProjectRecord,
  StoredSiteRecord,
} from "../src/application/ports/project-repository";
import type {
  ReportRepository,
  StoredReportSnapshotRecord,
} from "../src/application/ports/report-repository";
import type { AuthenticatedUser } from "../src/infrastructure/auth/types";
import { siteReportSnapshotSchema } from "../src/shared/schemas/report";

const analystUser: AuthenticatedUser = {
  userId: "analyst-1",
  email: "analyst@test.local",
  name: "Analyst",
  systemRole: "SEO_ANALYST",
  activeOrganizationId: null,
};

const REDACTED_CLIENT_DATAViewer: AuthenticatedUser = {
  userId: "viewer-1",
  email: "viewer@test.local",
  name: "Viewer",
  systemRole: "CLIENT_VIEWER",
  activeOrganizationId: null,
};

const sampleSite: StoredSiteRecord = {
  siteId: "site-REDACTED_CLIENT_DATA",
  projectId: "project-REDACTED_CLIENT_DATA",
  organizationId: "org-REDACTED_CLIENT_DATA",
  projectSlug: "REDACTED_CLIENT_DATA",
  siteSlug: "REDACTED_CLIENT_DATA",
  name: "REDACTED_CLIENT_DATA",
  url: "https://REDACTED_CLIENT_DATA",
  timezone: "+03:00",
  enabled: true,
  enabledSourceCount: 2,
};

const sampleProject: StoredProjectRecord = {
  projectId: "project-REDACTED_CLIENT_DATA",
  organizationId: "org-REDACTED_CLIENT_DATA",
  projectSlug: "REDACTED_CLIENT_DATA",
  name: "REDACTED_CLIENT_DATA",
  status: "ACTIVE",
  sites: [sampleSite],
};

const sampleReport = siteReportSnapshotSchema.parse({
  schemaVersion: 1,
  clientSlug: "REDACTED_CLIENT_DATA",
  siteSlug: "REDACTED_CLIENT_DATA",
  siteUrl: "https://REDACTED_CLIENT_DATA",
  generatedAt: "2026-08-30T00:00:00+03:00",
  freshness: "fresh",
  periodKey: "month",
  sources: {
    webmaster: {
      status: "success",
      fetchedAt: "2026-08-30T00:00:00+03:00",
      periodStart: "2026-08-03",
      periodEnd: "2026-08-30",
      timezone: "+03:00",
      note: null,
      safeErrorCode: null,
    },
    metrica: {
      status: "success",
      fetchedAt: "2026-08-30T00:00:00+03:00",
      periodStart: "2026-08-03",
      periodEnd: "2026-08-30",
      timezone: "+03:00",
      note: null,
      safeErrorCode: null,
    },
  },
  webmaster: null,
  metrica: null,
  ranking: null,
  comparison: null,
  combined: {
    funnel: {
      shows: 0,
      clicks: 0,
      visits: 0,
      goalReaches: 0,
      caveats: ["demo"],
    },
    opportunities: [],
    alerts: [],
    methodology: ["demo"],
  },
});

class FakeProjectRepository implements ProjectRepository {
  async listProjects(): Promise<StoredProjectRecord[]> {
    return [sampleProject];
  }

  async findProjectBySlug(projectSlug: string): Promise<StoredProjectRecord | null> {
    return projectSlug === sampleProject.projectSlug ? sampleProject : null;
  }

  async findSiteBySlugs(projectSlug: string, siteSlug: string): Promise<StoredSiteRecord | null> {
    return projectSlug === sampleSite.projectSlug && siteSlug === sampleSite.siteSlug ? sampleSite : null;
  }

  async hasOrganizationMembership(userId: string, organizationId: string): Promise<boolean> {
    return userId === "viewer-1" && organizationId === "org-REDACTED_CLIENT_DATA";
  }
}

class FakeReportRepository implements ReportRepository {
  async findLatestReportSnapshot(siteId: string): Promise<StoredReportSnapshotRecord | null> {
    return siteId === sampleSite.siteId
      ? {
          siteId: sampleSite.siteId,
          periodKey: "month",
          generatedAt: sampleReport.generatedAt,
          freshness: "fresh",
          payload: sampleReport,
        }
      : null;
  }
}

describe("ReportService", () => {
  const reportService = new ReportService(
    new FakeProjectRepository(),
    new FakeReportRepository(),
  );

  it("returns report for analyst", async () => {
    const report = await reportService.getSiteReportForUser(
      analystUser,
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "month",
    );
    expect(report?.clientSlug).toBe("REDACTED_CLIENT_DATA");
  });

  it("returns report for allowed client viewer", async () => {
    const report = await reportService.getSiteReportForUser(
      REDACTED_CLIENT_DATAViewer,
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "month",
    );
    expect(report?.siteSlug).toBe("REDACTED_CLIENT_DATA");
  });

  it("denies report outside allowed organization", async () => {
    const deniedReport = await reportService.getSiteReportForUser(
      REDACTED_CLIENT_DATAViewer,
      "REDACTED_CLIENT_DATA",
      "REDACTED_CLIENT_DATA",
      "month",
    );
    expect(deniedReport).toBeNull();
  });
});
