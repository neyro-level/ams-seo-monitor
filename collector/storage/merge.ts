import { siteReportSnapshotSchema, type SiteReportSnapshot } from "../../src/shared/schemas/report";

export function mergeWithLastKnownGood(
  previous: SiteReportSnapshot | null,
  incoming: SiteReportSnapshot,
): SiteReportSnapshot {
  if (!previous) {
    return siteReportSnapshotSchema.parse(incoming);
  }

  const merged = structuredClone(incoming);

  if (incoming.webmaster === null && incoming.sources.webmaster.status !== "success") {
    merged.webmaster = previous.webmaster;
  }

  if (incoming.metrica === null && incoming.sources.metrica.status !== "success") {
    merged.metrica = previous.metrica;
  }

  return siteReportSnapshotSchema.parse(merged);
}
