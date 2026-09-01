# DEPLOYMENT

## Current branch state

Ветка подготовила runtime assets для production cutover, но не выполняла production deploy.

Подготовлено:

- standalone web runtime;
- reverse-proxy Nginx config;
- canonical public domain `impulse.ams24.ru`;
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
- live Nginx config for `impulse.ams24.ru` passes `nginx -t`;

## Domain state

- DNS `impulse.ams24.ru` points to AMS Main Server;
- Let's Encrypt certificate is active through 2026-11-30 with automatic renewal;
- HTTP redirects to HTTPS;
- old `seo-monitor.ams24.ru` redirects to `https://impulse.ams24.ru`;
- current canonical production runtime is available on the new domain;
- Better Auth and PostgreSQL readiness return 200 after secret rotation.

## Remaining application steps

- apply the reviewed username migration;
- merge the branch into canonical `main`;
- deploy the exact reviewed main SHA with the AMS IMPULSE public landing;
- offsite bucket and restricted S3 credentials remain active through protected server env and Doppler `ams-seo-monitor/prd`.

## Production rule

Applying Nginx/systemd changes on the live server remains a separate explicit deploy action after merge gate.
