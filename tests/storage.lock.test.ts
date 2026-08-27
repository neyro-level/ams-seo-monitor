import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acquireSiteLock } from "../collector/storage/locks";
import { ensureStorageRoots } from "../collector/storage/layout";

const tempDirs: string[] = [];

async function createTempRoot() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ams-seo-monitor-lock-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("site locks", () => {
  it("blocks a second live writer", async () => {
    const rootDir = await createTempRoot();
    const first = await acquireSiteLock({ rootDir, clientSlug: "REDACTED_CLIENT_DATA", siteSlug: "REDACTED_CLIENT_DATA" });

    await expect(
      acquireSiteLock({ rootDir, clientSlug: "REDACTED_CLIENT_DATA", siteSlug: "REDACTED_CLIENT_DATA" }),
    ).rejects.toThrow("Lock already held");

    await first.release();
  });

  it("recovers a stale lock", async () => {
    const rootDir = await createTempRoot();
    const storagePaths = await ensureStorageRoots(rootDir);
    const lockPath = path.join(storagePaths.locksDir, "REDACTED_CLIENT_DATA__REDACTED_CLIENT_DATA.lock");

    await writeFile(lockPath, "stale", "utf8");
    const staleMoment = new Date(Date.now() - 60_000);
    await utimes(lockPath, staleMoment, staleMoment);

    const recovered = await acquireSiteLock({
      rootDir,
      clientSlug: "REDACTED_CLIENT_DATA",
      siteSlug: "REDACTED_CLIENT_DATA",
      staleAfterMs: 1_000,
    });

    expect(recovered.lockPath).toBe(lockPath);
    await recovered.release();
  });
});
