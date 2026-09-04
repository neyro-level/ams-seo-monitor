# DEPLOYMENT

> Standard 3.0 production baseline: immutable OCI image + Docker Compose web/worker + host Nginx + private/managed PostgreSQL. Production cutover still requires a separate owner command.

## Runtime

```text
Internet
→ Nginx TLS/reverse proxy
→ Docker Compose web on 127.0.0.1:3000
→ private/managed PostgreSQL

Docker Compose worker
→ pg-boss outbox loop
→ private/managed PostgreSQL

systemd timer
→ Docker Compose maintenance container
→ scheduled sync / outbox retention

systemd timer
→ PostgreSQL backup
→ private offsite S3-compatible storage
```

## Assets

- `Dockerfile`;
- `.dockerignore`;
- `docker-compose.production.yml`;
- `ops/nginx/ams-seo-monitor.conf`;
- `ops/systemd/seo-monitor-web.service`;
- `ops/systemd/seo-monitor-worker.service`;
- `ops/systemd/seo-monitor-worker.timer`;
- `ops/systemd/seo-monitor-outbox.service`;
- `ops/systemd/seo-monitor-outbox.timer`;
- `ops/systemd/seo-monitor-db-backup.service`;
- `ops/systemd/seo-monitor-db-backup.timer`;
- `ops/postgres/backup.sh`;
- `ops/postgres/restore-smoke.sh`.

## Release contract

1. Start from clean reviewed canonical `main`.
2. `scripts/verify-release-runtime.mjs` validates exact Node runtime.
3. `scripts/build-release.mjs` builds Linux image outside production host and packages `docker-image.tar` + manifest.
4. Linux target rejects a pre-existing release directory for the same SHA.
5. Target loads the immutable image; it does not run install or build.
6. Compose config resolves exact image tag from root-owned `shared/release.env`.
7. Pre-migration backup upload + HEAD confirmation and restore smoke pass.
8. `migrate` container runs Prisma migrations and pg-boss schema migration.
9. `seed` runs from the same immutable image.
10. Nginx/systemd assets are installed and validated.
11. `current` symlink switches atomically.
12. Deploy atomically materializes root-owned `shared/release.env` with SHA and image metadata.
13. Live/ready health must return exact target SHA; failure triggers code rollback.

Release rollback does not automatically reverse PostgreSQL migration/data.

## Environment separation

- web env: DB runtime + Better Auth + public Leads API build values;
- worker env: DB runtime + provider tokens/mappings;
- migrator env: schema migration credentials;
- backup env: restricted DB + offsite credentials with required-offsite mode;
- release env: deploy-generated `RELEASE_SHA`, `AMS_SEO_MONITOR_IMAGE`, `AMS_SEO_MONITOR_IMAGE_DIGEST`, mode `0640`, owner `root:www-data`.

Secret values remain outside artifact/Git. Deploy reads env as literal values, validates them before compose start and never accepts release SHA from browser input.

## Health and smoke

- `/api/health/live` — safe liveness, correlation ID and deployed SHA;
- `/api/health/ready` — DB + auth readiness, queue health, worker heartbeat, integration freshness, correlation ID and the same SHA; Nginx localhost-only;
- unauthenticated private route redirects to `/?login=1`;
- analyst login works;
- client foreign tenant route denied;
- web and worker containers use the same image digest;
- worker manual start succeeds;
- sync, outbox-retention and backup timers active;
- rollback updates release env to the previous SHA + image digest.

## Domain

Canonical public domain: `https://impulse.ams24.ru`. Legacy `https://seo-monitor.ams24.ru` redirects to it. Exact DNS/certificate/deployed SHA remain live-state facts and require external/server proof.

## Gate

Runtime, migrations, backup, Nginx/systemd/Compose, Docker image and dependency changes require HEAVY review. SourceCraft exact-head gate and operator evidence remain required. Merge does not deploy. Production follows `docs/RUNBOOK_DEPLOY.md` only after this Docker/Compose contract is reviewed.
