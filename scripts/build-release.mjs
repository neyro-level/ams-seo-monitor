import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const branch = execFileSync("git", ["branch", "--show-current"], {
  cwd: rootDir,
  encoding: "utf8",
}).trim();
const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: rootDir,
  encoding: "utf8",
}).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], {
  cwd: rootDir,
  encoding: "utf8",
}).trim();

if (branch !== "main") {
  throw new Error(`Release artifact must be built from main, current branch: ${branch || "detached"}.`);
}

if (dirty.length > 0) {
  throw new Error("Release artifact requires a clean Git worktree.");
}

if (!/^[0-9a-f]{40}$/.test(commitSha)) {
  throw new Error(`Invalid commit SHA: ${commitSha}`);
}

const artifactsDir = path.join(rootDir, ".release-artifacts");
const stagingDir = path.join(artifactsDir, "staging", commitSha);
const artifactName = `ams-seo-monitor-${commitSha}.tar.gz`;
const artifactPath = path.join(artifactsDir, artifactName);

await rm(stagingDir, { recursive: true, force: true });
await mkdir(stagingDir, { recursive: true });

for (const directory of ["dist-collector", "config", "ops", "public", "prisma", "node_modules"]) {
  await cp(path.join(rootDir, directory), path.join(stagingDir, directory), {
    recursive: true,
  });
}

await cp(path.join(rootDir, ".next", "standalone"), path.join(stagingDir, ".next", "standalone"), {
  recursive: true,
});
await cp(path.join(rootDir, ".next", "static"), path.join(stagingDir, ".next", "static"), {
  recursive: true,
});

for (const file of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "prisma.config.ts"]) {
  await cp(path.join(rootDir, file), path.join(stagingDir, file));
}

for (const relativePath of [
  "ops/nginx/ams-seo-monitor.conf",
  "ops/systemd/seo-monitor-web.service",
  "ops/systemd/seo-monitor-worker.service",
  "ops/systemd/seo-monitor-worker.timer",
  "ops/systemd/seo-monitor-db-backup.service",
  "ops/systemd/seo-monitor-db-backup.timer",
  "ops/postgres/backup.sh",
  "ops/postgres/restore-smoke.sh",
]) {
  const targetPath = path.join(stagingDir, relativePath);
  const content = await readFile(targetPath, "utf8");
  await writeFile(targetPath, content.replace(/\r\n/g, "\n"), "utf8");
}

const lockBytes = await readFile(path.join(rootDir, "pnpm-lock.yaml"));
const dependencyLockSha256 = createHash("sha256").update(lockBytes).digest("hex");
const manifest = {
  application: "ams-seo-monitor",
  repository: "integrator-p/ams-seo-monitor",
  source: "SourceCraft main",
  commitSha,
  createdAt: new Date().toISOString(),
  runtime: "next-standalone-node-v24-linux-x64",
  artifactFormat: "tar.gz",
  dependencyLockSha256,
  dependencyStrategy: "bundle-root-node-modules-standalone-and-compiled-worker",
};

await writeFile(
  path.join(stagingDir, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

const tarResult = spawnSync(
  "tar",
  ["-czf", artifactPath, "-C", stagingDir, "."],
  { cwd: rootDir, encoding: "utf8" },
);

if (tarResult.status !== 0) {
  throw new Error(`tar failed: ${tarResult.stderr || tarResult.stdout}`);
}

const artifactBytes = await readFile(artifactPath);
const artifactSha256 = createHash("sha256").update(artifactBytes).digest("hex");
await writeFile(`${artifactPath}.sha256`, `${artifactSha256}  ${artifactName}\n`, "utf8");
await rm(stagingDir, { recursive: true, force: true });

console.log(
  JSON.stringify(
    {
      artifactPath,
      artifactSha256,
      commitSha,
      dependencyLockSha256,
    },
    null,
    2,
  ),
);
