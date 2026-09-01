# DEPLOY RUNBOOK

## Target runtime

```text
Nginx
→ Next standalone web service
→ PostgreSQL

systemd timer
→ worker oneshot
→ PostgreSQL
```

## Reviewed assets

- `ops/nginx/ams-seo-monitor.conf`
- `ops/systemd/seo-monitor-web.service`
- `ops/systemd/seo-monitor-worker.service`
- `ops/systemd/seo-monitor-worker.timer`
- `ops/systemd/seo-monitor-db-backup.service`
- `ops/systemd/seo-monitor-db-backup.timer`

## Local proof already done in branch

- `pnpm build`
- `pnpm build:collector`
- `/api/health/live`
- `/api/health/ready`
- auth route and route gating
- systemd unit syntax verification
- Nginx config syntax verification in isolated temp wrapper

## Deploy shape

Immutable release artifact stores reviewed source and checked-in runtime assets:

- `src/`
- `collector/`
- `public/`
- `config/`
- `ops/`
- `prisma/`
- `scripts/`
- `next-env.d.ts`
- `next.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `tsconfig.collector.json`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `prisma.config.ts`
- `release-manifest.json`

Windows builder requires exact Node `24.20.0` and does not package `.next/standalone` or `dist-collector/` directly. Linux target verifies the same exact shared runtime, installs fresh dependencies from the reviewed lockfile, runs `pnpm build` and `pnpm build:collector` inside the immutable release, then applies migrations, reapplies `seo_monitor_app` grants/default privileges, runs seed, backup/restore smoke and only then switches runtime.

Environment files:

- web env must exist at `/etc/ams-platform/ams-seo-monitor-web.env` and contains only DB + Better Auth values;
- worker env must exist at `/etc/ams-platform/ams-seo-monitor-worker.env` and contains only DB + provider values;
- migrator env must already exist at `/etc/ams-platform/ams-seo-monitor-migrator.env`;
- mandatory offsite env lives at `/etc/ams-platform/ams-seo-monitor-backup.env` with `REQUIRE_OFFSITE=true`;
- deploy reads migrator values as literal `KEY=VALUE`, not shell code;
- offsite-required mode включён через dedicated restricted S3 credential в protected env.

Retry rules:

- active SHA is never rebuilt in place;
- any pre-existing `releases/<sha>` directory is treated as stale and rejected;
- any failure after the `current` switch must go through rollback before the deploy exits.

## Post-deploy smoke

- `seo-monitor-web.service` active;
- `seo-monitor-worker.timer` active;
- `seo-monitor-db-backup.timer` active;
- `/api/health/live` = 200;
- `/api/health/ready` = 200;
- analyst unauthenticated access redirects to `/?login=1` and opens the login modal;
- analyst sign-in works;
- client foreign project access denied;
- worker manual start succeeds.

## Offsite readiness

Private Timeweb bucket `ams-seo-monitor-offsite-20260831` активен. Dedicated user `seo-monitor-backup-s3` имеет read/write только на этот bucket. Production backup подтверждает dump и checksum через S3 HEAD до retention prune; shared S3 administrator credential не используется.
