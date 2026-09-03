# DEPLOYMENT

## Runtime

```text
Internet
→ Nginx TLS/reverse proxy
→ Next.js standalone on 127.0.0.1:3000
→ PostgreSQL local/private

systemd timer
→ worker oneshot
→ PostgreSQL

systemd timer
→ PostgreSQL backup
→ private offsite S3-compatible storage
```

## Assets

- `ops/nginx/ams-seo-monitor.conf`;
- `ops/systemd/seo-monitor-web.service`;
- `ops/systemd/seo-monitor-worker.service`;
- `ops/systemd/seo-monitor-worker.timer`;
- `ops/systemd/seo-monitor-db-backup.service`;
- `ops/systemd/seo-monitor-db-backup.timer`;
- `ops/postgres/backup.sh`;
- `ops/postgres/restore-smoke.sh`.

## Release contract

1. Start from clean reviewed canonical `main`.
2. `scripts/verify-release-runtime.mjs` validates exact Node runtime.
3. `scripts/build-release.mjs` creates immutable source artifact with commit SHA and lockfile checksum.
4. Linux target rejects a pre-existing release directory for the same SHA.
5. Target installs pnpm/dependencies from reviewed lockfile.
6. Web build runs with validated public Leads API build variables.
7. Build assembles `public/` and `.next/static/` inside standalone tree.
8. Worker compiles separately.
9. Migrator applies reviewed Prisma migrations.
10. Runtime grants/default privileges are restored for app role.
11. Reviewed seed updates runtime registry.
12. Mandatory backup upload + HEAD confirmation and isolated restore smoke pass.
13. Nginx/systemd assets are installed and validated.
14. `current` symlink switches atomically.
15. Health/auth/worker smoke determines success; failure triggers code rollback.

Release rollback does not automatically reverse PostgreSQL migration/data.

## Environment separation

- web env: DB runtime + Better Auth + public Leads API build values;
- worker env: DB runtime + provider tokens/mappings;
- migrator env: schema migration credentials;
- backup env: restricted offsite credentials with required-offsite mode.

Secret values remain outside artifact/Git. Deploy reads env as literal values, not shell code.

## Health and smoke

- `/api/health/live` — process liveness, public safe response;
- `/api/health/ready` — DB readiness, Nginx localhost-only;
- unauthenticated private route redirects to `/?login=1`;
- analyst login works;
- client foreign tenant route denied;
- favicon/static assets return 200 from standalone assembly;
- worker manual start succeeds;
- backup timer and worker timer active.

## Domain

Canonical public domain: `https://impulse.ams24.ru`. Legacy `https://seo-monitor.ams24.ru` redirects to it. Exact DNS/certificate/deployed SHA remain live-state facts and require external/server proof.

## Gate

Runtime, migrations, backup, Nginx/systemd and dependency changes require HEAVY review. Exact-head HEAVY runs `verify:fast`, real PostgreSQL integration, collector/build proof and Playwright golden paths. Merge does not deploy. Production deploy is a separate owner command and follows `docs/ops/DEPLOY_RUNBOOK.md`.
