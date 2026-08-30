# DEPLOYMENT

## Current branch state

Ветка подготовила runtime assets для production cutover, но не выполняла production deploy.

Подготовлено:

- standalone web runtime;
- reverse-proxy Nginx config;
- `seo-monitor-web.service`;
- `seo-monitor-worker.service`;
- `seo-monitor-worker.timer`;
- `seo-monitor-db-backup.service`;
- `seo-monitor-db-backup.timer`;
- release script updates for standalone artifact.

## Runtime target

```text
Internet
→ Nginx
→ Next standalone server
→ PostgreSQL

systemd timer
→ worker oneshot
→ PostgreSQL
```

## Verified in branch

- `pnpm build` produces standalone-ready output;
- local standalone runtime starts;
- `/api/health/live` and `/api/health/ready` return 200 with DB access;
- staged `systemd-analyze verify` passes for new unit files;
- staged `nginx -t` passes for reviewed config.

## Remaining external blocker

- offsite backup credentials/bucket are still missing in available Doppler scope.

## Production rule

Applying Nginx/systemd changes on the live server remains a separate explicit deploy action after merge gate.
