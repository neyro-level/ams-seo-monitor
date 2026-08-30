# DATABASE

## Status

Wave 0 target database contract for AMS SEO Monitor.

Current production still runs file-based snapshots. This document defines the PostgreSQL target that future waves will implement.

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

## Server baseline from Wave 0

Read-only checks on AMS Main Server:

- OS: Ubuntu `22.04.5 LTS`;
- `psql --version`: PostgreSQL `18.4` client from PGDG;
- `postgresql.service`: installed but inactive;
- TCP `5432`: not listening at the time of audit.

Decision: use PostgreSQL major `18` on this VPS. Bring patch level to the selected stable line during Wave 2.

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

Current file lock semantics are per site, not per site-period.

Target policy:

- one full sync lock per site;
- implement with PostgreSQL advisory lock or equivalent DB-safe guard;
- no distributed lock service.

## Backup policy

Backups are mandatory because relational data becomes critical runtime state.

### Format

- `pg_dump` custom format.

### Storage

- local transient backup on server;
- offsite copy to S3-compatible storage.

Backup on the same VPS only is not a real strategy.

### Schedule

Minimum:

- daily backups.

### Retention policy

Baseline policy for MVP:

- daily backups;
- weekly retained backups;
- monthly retained backups.

Exact counts are fixed during Wave 2 after storage sizing, but the shape must remain daily/weekly/monthly.

### Safety rules

- do not delete the previous valid backup before the new one is verified;
- backup credentials stay in server environment, not Git;
- backup logs contain artifact names, timestamps and status, not secrets.

## Restore policy

Required command/script:

```text
db:restore-smoke
```

Expected flow:

1. create temporary database;
2. restore latest backup;
3. verify key tables exist;
4. run row-count / sanity checks;
5. drop temporary database.

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