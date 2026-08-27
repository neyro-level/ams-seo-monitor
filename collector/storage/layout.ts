import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { SiteReportSnapshot } from "../../src/shared/schemas/report";

export type StoragePaths = {
  rootDir: string;
  snapshotsDir: string;
  clientReportsDir: string;
  syncStateDir: string;
  locksDir: string;
  backupStagingDir: string;
};

export function resolveStoragePaths(rootDir: string): StoragePaths {
  const normalizedRoot = path.resolve(rootDir);

  return {
    rootDir: normalizedRoot,
    snapshotsDir: path.join(normalizedRoot, "snapshots"),
    clientReportsDir: path.join(normalizedRoot, "client-reports"),
    syncStateDir: path.join(normalizedRoot, "sync-state"),
    locksDir: path.join(normalizedRoot, "locks"),
    backupStagingDir: path.join(normalizedRoot, "backup-staging"),
  };
}

export function getSiteSnapshotDirectory(rootDir: string, clientSlug: string, siteSlug: string) {
  return path.join(resolveStoragePaths(rootDir).snapshotsDir, clientSlug, siteSlug);
}

export function getLatestSnapshotPath(rootDir: string, clientSlug: string, siteSlug: string) {
  return path.join(getSiteSnapshotDirectory(rootDir, clientSlug, siteSlug), "latest.json");
}

export function getClientReportPath(rootDir: string, clientSlug: string, siteSlug: string) {
  return path.join(
    resolveStoragePaths(rootDir).clientReportsDir,
    clientSlug,
    siteSlug,
    "latest.json",
  );
}

export function getVersionedSnapshotPath(rootDir: string, snapshot: SiteReportSnapshot) {
  const safeTimestamp = snapshot.generatedAt.replace(/[+:]/g, "-");
  return path.join(
    getSiteSnapshotDirectory(rootDir, snapshot.clientSlug, snapshot.siteSlug),
    `snapshot-${safeTimestamp}.json`,
  );
}

export async function ensureStorageRoots(rootDir: string) {
  const paths = resolveStoragePaths(rootDir);
  await Promise.all(
    Object.values(paths).map((value) => mkdir(value, { recursive: true })),
  );
  return paths;
}
