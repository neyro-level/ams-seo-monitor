# Managed PostgreSQL Migration

Status: implementation-ready, not executed.

The production cutover is a separate `RISKY` release and requires an explicit owner command. Repository migrations do not create Timeweb resources and do not change the current production database.

## Required topology

- Timeweb Managed PostgreSQL 18 in the same Moscow private network as the application server;
- no public database endpoint;
- TLS connection from the application server;
- separate login credentials mapped one-to-one to `ams_web`, `ams_worker`, `ams_migrator` and `ams_backup` group roles;
- secrets stored in the project Doppler scope, never in Git or shell history.

`ams_web` and `ams_worker` are `NOBYPASSRLS` runtime roles. `ams_migrator` owns schema changes but is never used by the application. `ams_backup` is read-only and has `BYPASSRLS` so a logical backup cannot silently omit protected rows.

## Cutover gate

1. Create the managed cluster and private DNS/network route.
2. Create login identities and apply `ops/postgres/roles.sql` as the database administrator.
3. Restore a fresh production backup into an isolated target database.
4. Apply Prisma migrations with the migrator identity.
5. Compare row counts and checksums for every tenant-owned table.
6. Run the RLS matrix as web and worker identities, including missing context and cross-project UUID substitution.
7. Run application and worker smoke tests against the restored target.
8. Freeze writes on the old database, repeat delta migration and verification, then switch protected runtime secrets.
9. Verify live health, login, assigned SEO project, denied foreign project, worker heartbeat and backup.
10. Keep the old database read-only for 14 days. Deletion requires a separate owner decision.

## Hard stops

- Do not grant `BYPASSRLS` or table ownership to web/worker logins.
- Do not activate runtime group roles until every request/job opens a transaction and sets its verified authorization context.
- Do not expose the managed database through a public IP.
- Do not treat a successful dump as recovery proof; restore and row-count checks are mandatory.
