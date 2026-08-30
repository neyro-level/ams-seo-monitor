# MASTER PLAN

## Current branch state

Completed in `work/background-migration`:

- Next standalone server runtime;
- PostgreSQL 18 local-only foundation on AMS Main Server;
- Prisma schema, migrations and seed;
- Better Auth foundation and login route;
- analyst/client authorization model;
- application services and Prisma repositories;
- DB-backed worker sync;
- DB-backed report loading;
- health endpoints;
- reverse-proxy/systemd runtime assets;
- legacy filesystem sync path removed from active code path.

## Blocker

Not complete yet:

- offsite backup for PostgreSQL. Local backup and restore smoke are done, but S3-compatible bucket/credentials are absent in the available Doppler scope.

## Open finalization work

1. final docs sync and canon cleanup;
2. PR creation for the branch;
3. later: merge gate into `main` by explicit owner command;
4. later: production deploy by explicit owner command.

## What must remain true

- `SiteReportSnapshot` stays the browser contract;
- SEO semantics stay unchanged;
- PostgreSQL remains localhost-only;
- Better Auth remains the application auth layer;
- UI does not import Prisma.
