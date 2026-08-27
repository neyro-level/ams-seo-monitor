import path from "node:path";
import { stat, unlink, writeFile } from "node:fs/promises";
import { ensureStorageRoots, resolveStoragePaths } from "./layout";

export type LockHandle = {
  lockPath: string;
  release: () => Promise<void>;
};

type AcquireSiteLockOptions = {
  rootDir: string;
  clientSlug: string;
  siteSlug: string;
  staleAfterMs?: number;
};

export async function acquireSiteLock({
  rootDir,
  clientSlug,
  siteSlug,
  staleAfterMs = 15 * 60 * 1000,
}: AcquireSiteLockOptions): Promise<LockHandle> {
  await ensureStorageRoots(rootDir);
  const lockPath = path.join(resolveStoragePaths(rootDir).locksDir, `${clientSlug}__${siteSlug}.lock`);

  try {
    await writeFile(lockPath, JSON.stringify({ createdAt: new Date().toISOString() }), { flag: "wx" });
  } catch {
    const existingStat = await stat(lockPath).catch(() => null);
    const isStale = existingStat ? Date.now() - existingStat.mtimeMs > staleAfterMs : false;

    if (!isStale) {
      throw new Error(`Lock already held for ${clientSlug}/${siteSlug}`);
    }

    await unlink(lockPath).catch(() => undefined);
    await writeFile(lockPath, JSON.stringify({ createdAt: new Date().toISOString(), recovered: true }), {
      flag: "wx",
    });
  }

  return {
    lockPath,
    async release() {
      await unlink(lockPath).catch(() => undefined);
    },
  };
}
