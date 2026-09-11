# ENVIRONMENT

This document is the canonical registry of AMS IMPULSE environment variable ownership. Values are never stored in Git or docs.

## Sources

- Local development: ignored `.env.local` from `.env.example`.
- Application secret source: approved Doppler/project protected env.
- Production runtime: root-owned protected env files for web, worker, migrator and backup.
- Release identity: generated root-owned `shared/release.env`.
- Tests: explicit isolated `TEST_DATABASE_*`.
- SourceCraft workflow inputs: CI-owned, not application runtime env.

One credential must not be reused between web, worker, migrator, tests and backup.

## Database Variables

Application accepts either `DATABASE_URL` or a complete component set:

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `DATABASE_SSLMODE`

`APP_ENV` must identify `development`, `test` or `production`. Partial DB config fails closed. Diagnostics may print env, host, port, database and identity, but never full URL or password.

Prisma migration commands require explicit `DATABASE_URL`; `prisma generate` is DB-independent.

## Web/Auth Variables

- `BETTER_AUTH_SECRET` — secret, web only.
- `BETTER_AUTH_URL` — canonical public HTTPS origin.
- `RELEASE_SHA` — release identity for web/worker.
- `NEXT_PUBLIC_LEADS_API_URL` — public build-time lead endpoint origin.
- `NEXT_PUBLIC_LEADS_PROJECT_ID` — public project identifier.
- `NEXT_PUBLIC_LEADS_SITE_KEY` — public anti-abuse site identifier.
- `NODE_ENV` — runtime mode.

Changing `NEXT_PUBLIC_*` requires rebuild/redeploy. Changing runtime secret requires restart of affected process.

## Worker/Provider Variables

- `YANDEX_WEBMASTER_API_BASE_URL`
- `YANDEX_WEBMASTER_OAUTH_TOKEN`
- `YANDEX_WEBMASTER_TOKEN_STATUS`
- `YANDEX_METRICA_API_BASE_URL`
- `YANDEX_METRICA_OAUTH_TOKEN`
- `YANDEX_METRICA_TOKEN_STATUS`
- `TOPVISOR_USER_ID`
- `TOPVISOR_API_KEY`
- `TOPVISOR_API_BASE_URL`
- `OUTBOX_WORKER_ID`
- `OUTBOX_POLL_DELAY_MS`
- `LOG_LEVEL`
- `PGBOSS_SCHEMA`

Provider token presence does not enable provider calls by itself. Calls require enabled ProviderConnection in PostgreSQL and valid server-side env after restart. Browser must never receive provider token variables.

## Local/Test Variables

Local:

- `LOCAL_POSTGRES_PORT`
- `LOCAL_POSTGRES_USER`
- `LOCAL_POSTGRES_PASSWORD`

Tests:

- `TEST_DATABASE_HOST`
- `TEST_DATABASE_PORT`
- `TEST_DATABASE_USER`
- `TEST_DATABASE_PASSWORD`
- `TEST_DATABASE_NAME`
- `TEST_DATABASE_SSLMODE`

Test database name must end with `_test`; test identity must be dedicated and different from local/production identity.

## Backup/Restore Variables

- `DB_NAME`
- `BACKUP_ROOT`
- `BACKUP_FILE`
- `KEEP_DAILY`
- `KEEP_WEEKLY`
- `KEEP_MONTHLY`
- `S3_BUCKET`
- `S3_ENDPOINT`
- `S3_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `REQUIRE_OFFSITE`
- `POSTGRES_IMAGE`
- `MIN_PROJECT_COUNT`
- `MIN_SITE_COUNT`
- `MIN_REPORT_COUNT`

Backup variables never enter web/worker containers. Restore smoke targets only an ephemeral database.

## Change Rule

New env variable requires:

- owner boundary in this file;
- `.env.example` update when locally relevant;
- validation update;
- runbook update if operator-facing;
- no secret value in Git/docs/logs.
