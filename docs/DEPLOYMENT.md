# DEPLOYMENT

## Status

Wave 0 target deployment model for the backend rebuild.

Current production still uses static export, Nginx Basic Auth, filesystem JSON aliases and a collector oneshot service. This document defines the target cutover.

## Current audited baseline

Wave 0 confirmed:

- server: AMS Main Server;
- OS: Ubuntu `22.04.5 LTS`;
- current app deploy root: `/opt/ams-platform/ams-seo-monitor`;
- current state split: immutable `releases/<sha>` + mutable `shared/`;
- current web delivery: Nginx serves `current/out`;
- current background runtime: `ops/systemd/ams-seo-monitor.service` + `.timer`;
- current secrets path family: `/etc/ams-platform/*`;
- current auth boundary: Nginx Basic Auth.

## Target runtime topology

```text
Internet
  ↓
Nginx
  ↓ reverse proxy
Next.js server on localhost
  ↓
Application services / Better Auth / Prisma
  ↓
PostgreSQL on localhost or Unix socket

systemd timer
  ↓
Worker process
  ↓
PostgreSQL
```

## Production responsibilities

### Nginx

Keeps:

- TLS termination;
- reverse proxy;
- request hardening;
- cache policy for protected responses;
- public immutable handling for hashed static assets.

Removes:

- Basic Auth for normal product access;
- filesystem alias to `shared/client-reports`;
- static `try_files` app routing as the main delivery model.

### Next server runtime

Becomes the application server.

Must provide:

- app routes;
- Better Auth handlers;
- authenticated Server Components;
- health endpoints;
- internal data loading through services.

### Worker runtime

Separate oneshot process.

Must:

- run by systemd timer;
- sync providers;
- persist DB state;
- compile report snapshots;
- exit.

### PostgreSQL

Becomes runtime data source and backup target.

## Target systemd units

Minimum set:

```text
seo-monitor-web.service
seo-monitor-worker.service
seo-monitor-worker.timer
seo-monitor-db-backup.service
seo-monitor-db-backup.timer
```

Optional supporting units/scripts may appear, but this is the stable contract.

## Release artifact target

Current release artifact contains `out/` and `dist-collector/`. V2 must switch to a server-runtime artifact.

Target release content:

- Next production server output;
- worker runtime code;
- Prisma schema/client as needed by chosen build mode;
- reviewed ops assets;
- package/lock metadata;
- release manifest with exact commit SHA.

Keep:

- exact SHA release discipline;
- immutable release directories;
- atomic `current` switch;
- rollback pointer to previous release.

## Health endpoints

Required:

- `/api/health/live` — process alive;
- `/api/health/ready` — app can reach critical dependencies, at minimum PostgreSQL.

Health endpoints must not leak secrets or internal diagnostics bodies.

## Secrets

Remain outside Git and release artifact.

Minimum environment groups:

- `DATABASE_URL` and migration DB URL;
- `BETTER_AUTH_SECRET`;
- `BETTER_AUTH_URL`;
- `YANDEX_*`;
- `TOPVISOR_*`;
- backup storage credentials.

`.env.example` contains names only, not real values.

## Backup and restore

Deployment model is incomplete without database protection.

Required assets:

- `ops/postgres/backup.sh`;
- `seo-monitor-db-backup.service`;
- `seo-monitor-db-backup.timer`;
- restore smoke command/script.

Offsite backup is required. Same-disk-only dump is not enough.

## Validation after cutover

Minimum deploy smoke:

1. web service active;
2. worker unit callable;
3. Next responds through Nginx;
4. login works;
5. analyst can open all projects;
6. client can open only its organization subtree;
7. PostgreSQL reachable from app and worker;
8. latest report loads for one enabled site;
9. backup job runs;
10. restore smoke succeeds against temporary DB.

## Rollback principles

Rollback splits into two layers:

### Code rollback

- previous release remains available;
- `current` symlink switches atomically;
- `nginx -t` precedes reload.

### Data rollback/restore

- PostgreSQL state is not rolled back by switching code alone;
- backup + restore procedure is mandatory;
- migration rollback strategy must be explicit per schema change.

## Cutover risks from Wave 0 audit

- current deploy smoke depends on file existence under `shared/client-reports/REDACTED_CLIENT_DATA/*/month/latest.json`;
- current Nginx config embeds tenant isolation and auth assumptions;
- current service unit is REDACTED_CLIENT_DATA-specific: `client-sync REDACTED_CLIENT_DATA`;
- current local and prod runtime both assume `/c/*/data/*/latest.json` filesystem contract.

These must be replaced together, not piecemeal hidden behind long-term compatibility layers.

## Wave 9 acceptance target

Wave 9 is complete when:

- Nginx reverse-proxies to the Next server;
- Better Auth replaces Basic Auth for normal app access;
- worker timer runs separately from web service;
- PostgreSQL is active and reachable locally only;
- health endpoints are live;
- backup and restore smoke are wired into operations;
- deploy smoke no longer depends on filesystem report aliases.