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

Immutable release must contain:

- `.next/standalone`
- `.next/static`
- `public/`
- `dist-collector/`
- `config/`
- `ops/`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `release-manifest.json`

## Post-deploy smoke

- `seo-monitor-web.service` active;
- `seo-monitor-worker.timer` active;
- `seo-monitor-db-backup.timer` active;
- `/api/health/live` = 200;
- `/api/health/ready` = 200;
- analyst unauthenticated access redirects to `/login/`;
- analyst sign-in works;
- client foreign project access denied;
- worker manual start succeeds.

## Blocker

Offsite DB backup remains incomplete until S3-compatible credentials and bucket are provided.
