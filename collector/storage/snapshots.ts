import path from "node:path";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { siteReportSnapshotSchema, type SiteReportSnapshot } from "../../src/shared/schemas/report";
import { acquireSiteLock } from "./locks";
import { ensureStorageRoots, getLatestSnapshotPath, getVersionedSnapshotPath } from "./layout";
import { mergeWithLastKnownGood } from "./merge";

type PublishOptions = {
  rootDir: string;
  snapshot: SiteReportSnapshot;
  failStage?: "after-temp-write" | "before-latest-rename";
  staleLockMs?: number;
};

export async function readLatestSiteSnapshot(rootDir: string, clientSlug: string, siteSlug: string) {
  const latestPath = getLatestSnapshotPath(rootDir, clientSlug, siteSlug);
  const text = await readFile(latestPath, "utf8").catch(() => null);

  if (text === null) {
    return null;
  }

  try {
    return siteReportSnapshotSchema.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function publishSiteSnapshot({
  rootDir,
  snapshot,
  failStage,
  staleLockMs,
}: PublishOptions) {
  const validatedSnapshot = siteReportSnapshotSchema.parse(snapshot);
  await ensureStorageRoots(rootDir);
  const lock = await acquireSiteLock({
    rootDir,
    clientSlug: validatedSnapshot.clientSlug,
    siteSlug: validatedSnapshot.siteSlug,
    staleAfterMs: staleLockMs,
  });

  const versionedPath = getVersionedSnapshotPath(rootDir, validatedSnapshot);
  const latestPath = getLatestSnapshotPath(rootDir, validatedSnapshot.clientSlug, validatedSnapshot.siteSlug);
  const versionedTempPath = `${versionedPath}.tmp`;
  const latestTempPath = `${latestPath}.tmp`;

  try {
    const previous = await readLatestSiteSnapshot(
      rootDir,
      validatedSnapshot.clientSlug,
      validatedSnapshot.siteSlug,
    );
    const mergedSnapshot = mergeWithLastKnownGood(previous, validatedSnapshot);
    const serialized = `${JSON.stringify(mergedSnapshot, null, 2)}
`;

    await mkdir(path.dirname(versionedPath), { recursive: true });
    await writeFile(versionedTempPath, serialized, "utf8");

    if (failStage === "after-temp-write") {
      throw new Error("Simulated publish failure after temp write");
    }

    await rename(versionedTempPath, versionedPath);
    await mkdir(path.dirname(latestPath), { recursive: true });
    await writeFile(latestTempPath, serialized, "utf8");

    if (failStage === "before-latest-rename") {
      throw new Error("Simulated publish failure before latest rename");
    }

    await rename(latestTempPath, latestPath);

    return {
      latestPath,
      versionedPath,
      snapshot: mergedSnapshot,
    };
  } finally {
    await rm(versionedTempPath, { force: true }).catch(() => undefined);
    await rm(latestTempPath, { force: true }).catch(() => undefined);
    await lock.release();
  }
}
