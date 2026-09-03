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
6. Web environment проходит central DB/Auth/Leads schema preflight.
7. Build assembles `public/` и `.next/static/` inside standalone tree.
8. Worker compiles separately.
9. Migrator applies reviewed Prisma migrations.
10. Runtime grants/default privileges are restored for app role.
11. Reviewed seed updates runtime registry.
12. Mandatory backup upload + HEAD confirmation and isolated restore smoke pass.
13. Nginx/systemd assets are installed and validated.
14. `current` symlink switches atomically.
15. Deploy атомарно materialize-ит root-owned `shared/release.env`.
16. Live/ready health обязаны вернуть exact target SHA; failure triggers code rollback.

Release rollback does not automatically reverse PostgreSQL migration/data.

## Environment separation

- web env: DB runtime + Better Auth + public Leads API build values;
- worker env: DB runtime + provider tokens/mappings;
- migrator env: schema migration credentials;
- backup env: restricted offsite credentials with required-offsite mode;
- release env: deploy-generated `RELEASE_SHA`, mode `0640`, owner `root:www-data`.

Secret values remain outside artifact/Git. Deploy reads env as literal values, validates them before build and никогда не принимает release SHA из browser input.

## Health and smoke

- `/api/health/live` — safe liveness, correlation ID и deployed SHA;
- `/api/health/ready` — DB + auth readiness, correlation ID и тот же SHA; Nginx localhost-only;
- unauthenticated private route redirects to `/?login=1`;
- analyst login works;
- client foreign tenant route denied;
- favicon/static assets return 200 from standalone assembly;
- worker manual start succeeds;
- backup timer and worker timer active;
- rollback обновляет release env на SHA previous release.

## Domain

Canonical public domain: `https://impulse.ams24.ru`. Legacy `https://seo-monitor.ams24.ru` redirects to it. Exact DNS/certificate/deployed SHA remain live-state facts and require external/server proof.

## Gate

Runtime, migrations, backup, Nginx/systemd and dependency changes require HEAVY review. SourceCraft exact-head gate выполняет `verify:fast` и collector/build proof; operator отдельно подтверждает real PostgreSQL integration и Playwright до merge. Merge does not deploy. Production deploy is a separate owner command and follows `docs/ops/DEPLOY_RUNBOOK.md`.
