import { access, readFile } from "node:fs/promises";
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
  throw new Error(`Production deploy requires main, current branch: ${branch || "detached"}.`);
}
if (dirty.length > 0) {
  throw new Error("Production deploy requires a clean Git worktree.");
}
if (!/^[0-9a-f]{40}$/.test(commitSha)) {
  throw new Error(`Invalid commit SHA: ${commitSha}`);
}

const artifactName = `ams-seo-monitor-${commitSha}.tar.gz`;
const artifactPath = path.join(rootDir, ".release-artifacts", artifactName);
const checksumPath = `${artifactPath}.sha256`;
await access(artifactPath);
await access(checksumPath);

const manifestProbe = JSON.parse(
  execFileSync(
    "tar",
    ["-xOzf", artifactPath, "./release-manifest.json"],
    { cwd: rootDir, encoding: "utf8" },
  ),
);
if (manifestProbe.commitSha !== commitSha) {
  throw new Error(
    `Artifact manifest SHA ${manifestProbe.commitSha} does not match main ${commitSha}.`,
  );
}

execFileSync("scp", [artifactPath, checksumPath, "ams:/tmp/"], {
  cwd: rootDir,
  stdio: "inherit",
});

const remoteScript = `
set -euo pipefail
SHA="$1"
ARTIFACT_NAME="$2"
ROOT=/opt/ams-platform/ams-seo-monitor
RELEASE="$ROOT/releases/$SHA"
ARTIFACT="/tmp/$ARTIFACT_NAME"
CHECKSUM="/tmp/$ARTIFACT_NAME.sha256"
PREVIOUS="$(readlink -f "$ROOT/current" || true)"
NGINX_LIVE=/etc/nginx/sites-available/ams-seo-monitor.conf
NGINX_BACKUP="$ROOT/shared/previous-nginx.conf"

cd /tmp
sha256sum -c "$ARTIFACT_NAME.sha256"

if [ ! -d "$RELEASE" ]; then
  mkdir -p "$RELEASE"
  tar -xzf "$ARTIFACT" -C "$RELEASE"
fi

MANIFEST_SHA="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["commitSha"])' "$RELEASE/release-manifest.json")"
if [ "$MANIFEST_SHA" != "$SHA" ]; then
  echo "Release manifest mismatch" >&2
  exit 1
fi

EXPECTED_LOCK="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["dependencyLockSha256"])' "$RELEASE/release-manifest.json")"
ACTUAL_LOCK="$(sha256sum "$RELEASE/pnpm-lock.yaml" | cut -d ' ' -f1)"
if [ "$EXPECTED_LOCK" != "$ACTUAL_LOCK" ]; then
  echo "Dependency lock checksum mismatch" >&2
  exit 1
fi


sha256sum "$ARTIFACT" | cut -d ' ' -f1 > "$RELEASE/artifact.sha256"
chown root:www-data "$RELEASE"
find "$RELEASE" -path "$RELEASE/node_modules" -prune -o -type d -exec chmod 0755 {} +
find "$RELEASE" -path "$RELEASE/node_modules" -prune -o -type f -exec chmod 0644 {} +

rm -f "$ROOT/current.next"
ln -s "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"

install -m 0644 "$RELEASE/ops/systemd/seo-monitor-web.service" /etc/systemd/system/seo-monitor-web.service
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-worker.service" /etc/systemd/system/seo-monitor-worker.service
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-worker.timer" /etc/systemd/system/seo-monitor-worker.timer
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-db-backup.service" /etc/systemd/system/seo-monitor-db-backup.service
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-db-backup.timer" /etc/systemd/system/seo-monitor-db-backup.timer
cp "$NGINX_LIVE" "$NGINX_BACKUP"
install -m 0644 "$RELEASE/ops/nginx/ams-seo-monitor.conf" "$NGINX_LIVE"
systemctl daemon-reload

if ! nginx -t; then
  if [ -n "$PREVIOUS" ]; then
    rm -f "$ROOT/current.rollback"
    ln -s "$PREVIOUS" "$ROOT/current.rollback"
    mv -Tf "$ROOT/current.rollback" "$ROOT/current"
  fi
  cp "$NGINX_BACKUP" "$NGINX_LIVE"
  nginx -t
  exit 1
fi
systemctl reload nginx

if ! systemctl restart seo-monitor-web.service; then
  if [ -n "$PREVIOUS" ]; then
    rm -f "$ROOT/current.rollback"
    ln -s "$PREVIOUS" "$ROOT/current.rollback"
    mv -Tf "$ROOT/current.rollback" "$ROOT/current"
  fi
  cp "$NGINX_BACKUP" "$NGINX_LIVE"
  nginx -t
  systemctl reload nginx
  exit 1
fi

if ! systemctl start seo-monitor-worker.service; then
  if [ -n "$PREVIOUS" ]; then
    rm -f "$ROOT/current.rollback"
    ln -s "$PREVIOUS" "$ROOT/current.rollback"
    mv -Tf "$ROOT/current.rollback" "$ROOT/current"
  fi
  cp "$NGINX_BACKUP" "$NGINX_LIVE"
  nginx -t
  systemctl reload nginx
  exit 1
fi

systemctl enable --now seo-monitor-worker.timer
systemctl enable --now seo-monitor-db-backup.timer
systemctl is-active seo-monitor-web.service
systemctl is-active seo-monitor-worker.timer
systemctl is-active seo-monitor-db-backup.timer
curl -fsS http://127.0.0.1:3000/api/health/live >/dev/null
curl -fsS http://127.0.0.1:3000/api/health/ready >/dev/null

test -s "$ROOT/current/.next/standalone/server.js"
test -s "$ROOT/current/dist-collector/src/worker/main.js"

rm -f "$ARTIFACT" "$CHECKSUM"
printf '%s\n' "$PREVIOUS" > "$ROOT/shared/previous-release.txt"
printf '%s\n' "$SHA" > "$ROOT/shared/deployed-sha.txt"
`;

const deployResult = spawnSync(
  "ssh",
  ["-o", "BatchMode=yes", "ams", "bash", "-s", "--", commitSha, artifactName],
  {
    cwd: rootDir,
    input: remoteScript,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  },
);

if (deployResult.status !== 0) {
  throw new Error(`Production deploy failed with status ${deployResult.status}.`);
}

const checksum = (await readFile(checksumPath, "utf8")).trim().split(/\s+/)[0];
console.log(
  JSON.stringify(
    {
      deployedSha: commitSha,
      artifact: artifactName,
      artifactSha256: checksum,
      productionUrl: "https://seo-monitor.ams24.ru",
    },
    null,
    2,
  ),
);
