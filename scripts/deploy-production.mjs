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
  execFileSync("tar", ["-xOzf", artifactPath, "./release-manifest.json"], {
    cwd: rootDir,
    encoding: "utf8",
  }),
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

const remoteScript = String.raw`
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
WEB_ENV_FILE=/etc/ams-platform/ams-seo-monitor-web.env
WORKER_ENV_FILE=/etc/ams-platform/ams-seo-monitor-worker.env
MIGRATOR_ENV_FILE=/etc/ams-platform/ams-seo-monitor-migrator.env
BACKUP_ENV_FILE=/etc/ams-platform/ams-seo-monitor-backup.env
RUNTIME_BIN="$ROOT/shared/runtime/current/bin"
EXPECTED_NODE_VERSION=v24.20.0

if [ ! -x "$RUNTIME_BIN/node" ]; then
  echo "Missing production Node runtime: $RUNTIME_BIN/node" >&2
  exit 1
fi
ACTUAL_NODE_VERSION="$($RUNTIME_BIN/node -v)"
if [ "$ACTUAL_NODE_VERSION" != "$EXPECTED_NODE_VERSION" ]; then
  echo "Production Node mismatch: expected $EXPECTED_NODE_VERSION, got $ACTUAL_NODE_VERSION" >&2
  exit 1
fi
export PATH="$RUNTIME_BIN:$PATH"

if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" = "$RELEASE" ]; then
  echo "Target release is already current; refusing in-place rebuild" >&2
  exit 1
fi

write_release_env() {
  local release_sha="$1"
  printf 'RELEASE_SHA=%s\n' "$release_sha" > "$ROOT/shared/release.env.next"
  chown root:www-data "$ROOT/shared/release.env.next"
  chmod 0640 "$ROOT/shared/release.env.next"
  mv -f "$ROOT/shared/release.env.next" "$ROOT/shared/release.env"
}

rollback_previous() {
  systemctl stop seo-monitor-worker.service seo-monitor-outbox.service seo-monitor-web.service >/dev/null 2>&1 || true
  systemctl disable --now seo-monitor-worker.timer seo-monitor-outbox.timer seo-monitor-db-backup.timer >/dev/null 2>&1 || true

  if [ -n "$PREVIOUS" ]; then
    rm -f "$ROOT/current.rollback"
    ln -s "$PREVIOUS" "$ROOT/current.rollback"
    mv -Tf "$ROOT/current.rollback" "$ROOT/current"
    PREVIOUS_SHA="$(basename "$PREVIOUS")"
    if [[ "$PREVIOUS_SHA" =~ ^[0-9a-f]{40}$ ]]; then
      write_release_env "$PREVIOUS_SHA"
    fi

    if [ -f "$PREVIOUS/ops/nginx/ams-seo-monitor.conf" ]; then
      install -m 0644 "$PREVIOUS/ops/nginx/ams-seo-monitor.conf" "$NGINX_LIVE"
    elif [ -f "$NGINX_BACKUP" ]; then
      cp "$NGINX_BACKUP" "$NGINX_LIVE"
    fi

    if [ -f "$PREVIOUS/ops/systemd/seo-monitor-web.service" ]; then
      install -m 0644 "$PREVIOUS/ops/systemd/seo-monitor-web.service" /etc/systemd/system/seo-monitor-web.service
      install -m 0644 "$PREVIOUS/ops/systemd/seo-monitor-worker.service" /etc/systemd/system/seo-monitor-worker.service
      install -m 0644 "$PREVIOUS/ops/systemd/seo-monitor-worker.timer" /etc/systemd/system/seo-monitor-worker.timer
      install -m 0644 "$PREVIOUS/ops/systemd/seo-monitor-db-backup.service" /etc/systemd/system/seo-monitor-db-backup.service
      install -m 0644 "$PREVIOUS/ops/systemd/seo-monitor-db-backup.timer" /etc/systemd/system/seo-monitor-db-backup.timer
      if [ -f "$PREVIOUS/ops/systemd/seo-monitor-outbox.service" ]; then
        install -m 0644 "$PREVIOUS/ops/systemd/seo-monitor-outbox.service" /etc/systemd/system/seo-monitor-outbox.service
        install -m 0644 "$PREVIOUS/ops/systemd/seo-monitor-outbox.timer" /etc/systemd/system/seo-monitor-outbox.timer
      else
        rm -f /etc/systemd/system/seo-monitor-outbox.service /etc/systemd/system/seo-monitor-outbox.timer
      fi
      systemctl daemon-reload
      nginx -t
      systemctl reload nginx
      systemctl restart seo-monitor-web.service || true
      systemctl enable --now seo-monitor-worker.timer seo-monitor-db-backup.timer >/dev/null 2>&1 || true
      if [ -f "$PREVIOUS/ops/systemd/seo-monitor-outbox.timer" ]; then
        systemctl enable --now seo-monitor-outbox.timer >/dev/null 2>&1 || true
      fi
    elif [ -f "$PREVIOUS/ops/systemd/ams-seo-monitor.service" ]; then
      install -m 0644 "$PREVIOUS/ops/systemd/ams-seo-monitor.service" /etc/systemd/system/ams-seo-monitor.service
      rm -f /etc/systemd/system/seo-monitor-outbox.service /etc/systemd/system/seo-monitor-outbox.timer
      install -m 0644 "$PREVIOUS/ops/systemd/ams-seo-monitor.timer" /etc/systemd/system/ams-seo-monitor.timer
      systemctl daemon-reload
      nginx -t
      systemctl reload nginx
      systemctl restart ams-seo-monitor.service || true
      systemctl enable --now ams-seo-monitor.timer >/dev/null 2>&1 || true
    fi
  fi
}

post_switch_rollback() {
  trap - ERR
  rollback_previous
}

run_with_env_file() {
  local env_file="$1"
  shift
  python3 - "$env_file" "$@" <<'PY'
import os
import subprocess
import sys

env_path = sys.argv[1]
command = sys.argv[2:]
env = os.environ.copy()
with open(env_path, encoding="utf-8") as handle:
    for raw_line in handle:
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise SystemExit(f"Invalid env line in {env_path}: {raw_line.rstrip()}")
        key, value = line.split("=", 1)
        key = key.removeprefix("export ").strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        env[key] = value
subprocess.run(command, env=env, check=True)
PY
}

cd /tmp
sha256sum -c "$ARTIFACT_NAME.sha256"

if [ -e "$RELEASE" ]; then
  echo "Release directory already exists: $RELEASE" >&2
  exit 1
fi
mkdir -p "$RELEASE"
tar -xzf "$ARTIFACT" -C "$RELEASE"

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

if [ ! -f "$WEB_ENV_FILE" ]; then
  echo "Missing web env file: $WEB_ENV_FILE" >&2
  exit 1
fi
if [ ! -f "$WORKER_ENV_FILE" ]; then
  echo "Missing worker env file: $WORKER_ENV_FILE" >&2
  exit 1
fi
if [ ! -f "$MIGRATOR_ENV_FILE" ]; then
  echo "Missing migrator env file: $MIGRATOR_ENV_FILE" >&2
  exit 1
fi
if [ ! -f "$BACKUP_ENV_FILE" ]; then
  echo "Missing mandatory offsite backup env file: $BACKUP_ENV_FILE" >&2
  exit 1
fi

sha256sum "$ARTIFACT" | cut -d ' ' -f1 > "$RELEASE/artifact.sha256"
chown root:www-data "$RELEASE"
find "$RELEASE" -path "$RELEASE/node_modules" -prune -o -type d -exec chmod 0755 {} +
find "$RELEASE" -path "$RELEASE/node_modules" -prune -o -type f -exec chmod 0644 {} +
chmod 0755 "$RELEASE/ops/postgres/backup.sh" "$RELEASE/ops/postgres/restore-smoke.sh"

rm -rf "$RELEASE/node_modules"
corepack enable
corepack prepare pnpm@11.5.1 --activate
(cd "$RELEASE" && pnpm install --frozen-lockfile)
chmod 0755 "$RELEASE/node_modules/.bin/prisma" || true
(
  cd "$RELEASE"
  run_with_env_file "$WEB_ENV_FILE" "$RELEASE/node_modules/tsx/dist/cli.mjs" "$RELEASE/scripts/verify-web-environment.ts"
  run_with_env_file "$WEB_ENV_FILE" pnpm build
  pnpm build:collector
)

run_with_env_file "$MIGRATOR_ENV_FILE" "$RELEASE/node_modules/.bin/prisma" migrate deploy --config "$RELEASE/prisma.config.ts"
runuser -u postgres -- psql -d seo_monitor_prod -v ON_ERROR_STOP=1 -c "GRANT USAGE ON SCHEMA public TO seo_monitor_app; GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO seo_monitor_app; GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO seo_monitor_app; ALTER DEFAULT PRIVILEGES FOR USER seo_monitor_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO seo_monitor_app; ALTER DEFAULT PRIVILEGES FOR USER seo_monitor_migrator IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO seo_monitor_app;"
run_with_env_file "$MIGRATOR_ENV_FILE" "$RELEASE/node_modules/tsx/dist/cli.mjs" "$RELEASE/scripts/seed-database.ts"

install -m 0755 "$RELEASE/ops/postgres/backup.sh" /usr/local/bin/seo-monitor-db-backup.sh
install -m 0755 "$RELEASE/ops/postgres/restore-smoke.sh" /usr/local/bin/seo-monitor-db-restore-smoke.sh
install -d -o postgres -g postgres -m 0750 /var/backups/ams-seo-monitor-postgres /var/backups/ams-seo-monitor-postgres/tmp /var/backups/ams-seo-monitor-postgres/daily /var/backups/ams-seo-monitor-postgres/weekly /var/backups/ams-seo-monitor-postgres/monthly
chown -R postgres:postgres /var/backups/ams-seo-monitor-postgres
run_with_env_file "$BACKUP_ENV_FILE" runuser -u postgres --preserve-environment -- /usr/bin/env REQUIRE_OFFSITE=true /usr/local/bin/seo-monitor-db-backup.sh >/dev/null
/usr/local/bin/seo-monitor-db-restore-smoke.sh >/dev/null

if ! id -u seo-monitor-worker >/dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin --gid www-data seo-monitor-worker
fi

install -m 0644 "$RELEASE/ops/systemd/seo-monitor-web.service" /etc/systemd/system/seo-monitor-web.service
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-worker.service" /etc/systemd/system/seo-monitor-worker.service
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-worker.timer" /etc/systemd/system/seo-monitor-worker.timer
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-outbox.service" /etc/systemd/system/seo-monitor-outbox.service
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-outbox.timer" /etc/systemd/system/seo-monitor-outbox.timer
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-db-backup.service" /etc/systemd/system/seo-monitor-db-backup.service
install -m 0644 "$RELEASE/ops/systemd/seo-monitor-db-backup.timer" /etc/systemd/system/seo-monitor-db-backup.timer
cp "$NGINX_LIVE" "$NGINX_BACKUP"
install -m 0644 "$RELEASE/ops/nginx/ams-seo-monitor.conf" "$NGINX_LIVE"

trap post_switch_rollback ERR
rm -f "$ROOT/current.next"
ln -s "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
write_release_env "$SHA"

systemctl daemon-reload
nginx -t
systemctl reload nginx
systemctl restart seo-monitor-web.service
systemctl start seo-monitor-worker.service
systemctl stop ams-seo-monitor.service >/dev/null 2>&1 || true
systemctl disable --now ams-seo-monitor.timer >/dev/null 2>&1 || true
systemctl enable --now seo-monitor-worker.timer
systemctl enable --now seo-monitor-outbox.timer
systemctl enable --now seo-monitor-db-backup.timer
systemctl is-active seo-monitor-web.service
systemctl is-active seo-monitor-worker.timer
systemctl is-active seo-monitor-outbox.timer
systemctl is-active seo-monitor-db-backup.timer
curl -fsS http://127.0.0.1:3000/api/health/live | python3 -c 'import json,sys; payload=json.load(sys.stdin); assert payload["releaseSha"] == sys.argv[1]' "$SHA"
curl -fsS http://127.0.0.1:3000/api/health/ready | python3 -c 'import json,sys; payload=json.load(sys.stdin); deps=payload["dependencies"]; assert payload["releaseSha"] == sys.argv[1]; assert deps["postgresql"] == "ready"; assert deps["auth"] == "configured"; assert isinstance(deps["outbox"]["deadLetter"], int)' "$SHA"
test -s "$ROOT/current/.next/standalone/server.js"
test -s "$ROOT/current/dist-collector/src/worker/main.js"
test -s "$ROOT/current/prisma/schema.prisma"
rm -f "$ARTIFACT" "$CHECKSUM"
printf '%s\n' "$PREVIOUS" > "$ROOT/shared/previous-release.txt"
printf '%s\n' "$SHA" > "$ROOT/shared/deployed-sha.txt"
trap - ERR
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
      productionUrl: "https://impulse.ams24.ru",
    },
    null,
    2,
  ),
);
