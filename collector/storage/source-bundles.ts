import path from "node:path";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import {
  siteSourceBundleSchema,
  type SiteSourceBundle,
} from "../../src/shared/schemas/source-bundle";
import { getSiteSnapshotDirectory } from "./layout";

export async function publishSiteSourceBundle(args: {
  rootDir: string;
  bundle: SiteSourceBundle;
}) {
  const bundle = siteSourceBundleSchema.parse(args.bundle);
  const directory = getSiteSnapshotDirectory(
    args.rootDir,
    bundle.clientSlug,
    bundle.siteSlug,
    bundle.periodKey,
  );
  const safeTimestamp = bundle.generatedAt.replace(/[+:]/g, "-");
  const versionedPath = path.join(directory, `sources-${safeTimestamp}.json`);
  const latestPath = path.join(directory, "latest-sources.json");
  const versionedTempPath = `${versionedPath}.tmp`;
  const latestTempPath = `${latestPath}.tmp`;
  const serialized = `${JSON.stringify(bundle, null, 2)}\n`;

  try {
    await mkdir(directory, { recursive: true });
    await writeFile(versionedTempPath, serialized, "utf8");
    await rename(versionedTempPath, versionedPath);
    await writeFile(latestTempPath, serialized, "utf8");
    await rename(latestTempPath, latestPath);
    return { versionedPath, latestPath };
  } finally {
    await rm(versionedTempPath, { force: true }).catch(() => undefined);
    await rm(latestTempPath, { force: true }).catch(() => undefined);
  }
}
