# DATABASE

## Status

PostgreSQL foundation и обслуживание активны.

Реализовано и проверено:

- PostgreSQL `18.6` на AMS Main Server;
- active cluster `18/main` на `127.0.0.1:5432`;
- databases `seo_monitor_dev`, `seo_monitor_test`, `seo_monitor_prod`;
- отдельные роли `seo_monitor_app` и `seo_monitor_migrator`;
- autovacuum и autoanalyze включены;
- ежедневный local `pg_dump` custom-format через systemd timer;
- private offsite S3 copy с обязательным object HEAD confirmation;
- checksum каждого backup;
- retention `7 daily / 8 weekly / 6 monthly`;
- restore smoke во временную БД с проверкой migrations и основных row counts.

## Goal

PostgreSQL becomes the primary runtime source of truth for:

- organizations;
- users and memberships;
- projects and sites;
- provider connections;
- tracked queries and clusters;
- sync runs and source runs;
- historical metrics;
- technical snapshots;
- compiled report snapshots.

Filesystem stops being the primary product database.

## Server baseline and current state

Wave 0 read-only checks found:

- OS: Ubuntu `22.04.5 LTS`;
- PostgreSQL `17` default cluster was present, down, and contained only the default `postgres` database;
- PostgreSQL `18.4` client from PGDG was already installed.

Wave 2 execution changed this to:

- PostgreSQL `18.6` package installed from PGDG;
- cluster `18/main` created and enabled;
- listener restricted to `127.0.0.1:5432`;
- TCP `5432` remains closed externally by firewall policy;
- previous empty `17/main` cluster archived to `/root/postgresql-17-main-pre-migration.tar.gz` before removal.

## Topology

Database runs locally on the VPS.

Allowed exposure:

- `127.0.0.1`;
- Unix socket.

Not allowed:

- public PostgreSQL listener in the Internet;
- pgAdmin exposed publicly;
- broad firewall opening for `5432`.

Remote manual access, when needed:

- SSH tunnel only.

## Databases

Minimum set:

- `seo_monitor_dev`;
- `seo_monitor_test`;
- `seo_monitor_prod`.

Rules:

- test never points to prod;
- dev never points to prod;
- restore smoke uses a temporary restore database, not prod;
- environment variables clearly separate app, test and migration URLs.

## Roles

Minimum PostgreSQL roles:

### `seo_monitor_app`

Used by:

- Next server runtime;
- worker runtime.

Permissions:

- connect to app databases;
- read/write application tables;
- no superuser;
- no broad database-administration privileges.

### `seo_monitor_migrator`

Used by:

- Prisma migrations;
- schema rollout.

Permissions:

- schema change privileges for the target app database;
- still no superuser unless unavoidable and explicitly documented.

Application runtime does not use migrator credentials.

## Schema policy

- Prisma schema is the source of truth for application tables.
- PostgreSQL is the source of truth for runtime data.
- Do not treat PostgreSQL as a JSON dump for all product state.
- Use relational tables for frequent metrics and joins.
- Use JSONB only for complex technical provider payloads that are naturally nested.

## Locking policy

Current policy:

- one session-level PostgreSQL advisory lock for the whole full-sync runtime;
- systemd and direct CLI runs share the same DB-backed guard;
- lock is released in `finally` and by PostgreSQL if the worker connection dies;
- no distributed lock service.

## Backup policy

Backups are mandatory because relational data becomes critical runtime state.

### Format

- `pg_dump` custom format.

### Storage

- local retained backup on server;
- private offsite copy to S3-compatible storage;
- Timeweb bucket `ams-seo-monitor-offsite-20260831` (private, standard 1 GB, `ru-1`) активен; отдельный S3 user `seo-monitor-backup-s3` имеет только read/write на этот bucket, credentials materialized в protected server env и Doppler `ams-seo-monitor/prd`.

Backup on the same VPS only is not a real strategy.

### Schedule

Minimum:

- daily backups.

### Retention policy

Baseline policy for MVP:

- keep 7 daily backups;
- keep 8 weekly backups;
- keep 6 monthly backups.

### Safety rules

- do not delete the previous valid backup before the new one is verified;
- backup credentials stay in server environment, not Git;
- backup logs contain artifact names, timestamps and status, not secrets.

## Restore policy

Required command/script:

```text
db:restore-smoke
```

Current implementation:

1. create a temporary database;
2. restore the latest custom-format dump;
3. verify database identity and owner;
4. verify Prisma migrations and key tables;
5. require non-zero `Project`, `Site` and `ReportSnapshot` row-count sanity;
6. drop the temporary database in `trap` cleanup.

Never restore over production for testing.

## Secrets and URLs

Server environment must provide at least:

- `DATABASE_URL` for runtime;
- migrator DB URL for schema rollout;
- offsite backup credentials;
- Better Auth secret and URL;
- provider tokens.

These values are not stored in Git, Prisma schema, seeds or browser code.

## Health dependency

`/api/health/ready` must include a database readiness check. It must prove that the app can actually reach PostgreSQL, not only boot the process.

## Wave 2 acceptance target

Wave 2 is complete when:

- PostgreSQL 18 is installed and active;
- local-only binding or Unix socket is enforced;
- `seo_monitor_dev`, `seo_monitor_test`, `seo_monitor_prod` exist;
- `seo_monitor_app` and `seo_monitor_migrator` are separated;
- Prisma can connect successfully;
- backup script exists and works;
- offsite copy exists;
- restore smoke passes against a temporary DB.

## Future ownership map

PostgreSQL will own:

- tenant and auth model;
- provider configuration;
- sync run history;
- all published report snapshots;
- historical metrics and ranking captures.

Filesystem will remain only for:

- release artifacts;
- temporary backup files;
- logs/runtime files if required by the host;
- test fixtures in the repository.