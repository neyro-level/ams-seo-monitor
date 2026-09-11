# DEPLOY RUNBOOK

Production deploy is owner-gated. Merge, artifact build and deploy are separate steps.

## Scope

Deploy reviewed canonical `main` as immutable OCI image through Docker Compose and host Nginx. This runbook does not authorize deploy by itself.

Project topology:

- web binds `127.0.0.1:3000`;
- host Nginx terminates external traffic;
- current application uses self-managed PostgreSQL 18 until the managed database migration release;
- target application uses Timeweb Managed PostgreSQL 18 through private TLS networking;
- protected env files are separated for web, worker, migrator and backup;
- database migration is a separate owner-approved RISKY release and is never an ordinary code deploy side effect.

## Preconditions

- clean local `main` fast-forwarded to `origin/main`;
- exact commit SHA reviewed and SourceCraft Merge Gate green;
- release target and previous release are known;
- Docker Engine + Compose available on target Linux host;
- required protected env files exist;
- no secret value is printed;
- current rollback target is readable;
- backup/offsite/restore smoke tooling is available.

## Build Artifact

```bash
pnpm release:build
```

Artifact includes:

- `docker-image.tar`;
- `docker-compose.production.yml`;
- reviewed `ops/` assets;
- `release-manifest.json` with exact SHA, image tag, image digest and lock checksum.

Artifact does not include DB data, local env or secrets.

## Target Preparation

Deploy script must:

1. upload artifact/checksum;
2. verify checksum and manifest SHA;
3. reject existing target release directory and in-place rebuild;
4. validate protected env files;
5. load OCI image and verify digest;
6. validate Compose config under project name `ams-seo-monitor`;
7. install backup/restore scripts;
8. run pre-migration backup with the dedicated backup identity;
9. require offsite upload + remote HEAD confirmation;
10. restore exact immutable backup file into isolated PostgreSQL for smoke;
11. run Prisma migrate deploy and pg-boss schema migration;
12. never run operator config sync automatically;
13. install reviewed Nginx/systemd assets.

Any failure before symlink switch leaves current code runtime untouched.

## Cutover

After preparation:

1. arm automatic post-switch rollback;
2. switch `current` symlink atomically;
3. write root-owned `shared/release.env` with exact SHA/tag/digest;
4. reload systemd;
5. validate and reload Nginx;
6. restart Compose stack through `seo-monitor-web.service`;
7. run scheduled sync once;
8. enable sync, Topvisor, competitors, outbox-retention and backup timers;
9. verify web and worker containers use the exact image digest;
10. require loopback live/ready DTOs to report exact target SHA, DB/auth/outbox/worker/integration freshness;
11. record previous release and deployed SHA;
12. remove uploaded temp artifact/checksum.

## Post-Deploy Smoke

Required:

- public `/` returns 200 and canonical metadata;
- `/api/health/live` returns 200, correlation ID and deployed SHA;
- loopback `/api/health/ready` returns 200 with same SHA, PostgreSQL ready, auth configured, outbox counts, worker heartbeat and integration freshness;
- external `/api/health/ready` returns 403;
- unauthenticated `/analyst/` redirects to `/?login=1`;
- `/manifest.webmanifest` returns the AMS PWA manifest and `/sw.js` has `no-store` headers;
- service worker cache contains only reviewed static asset paths, never private HTML/API/MCP;
- analyst sign-in and report read work;
- assigned Tools user sees only allowed Research projects; foreign URL/action/MCP identifiers return not-found/deny;
- client cannot read foreign project/site/report;
- web and worker use same image digest;
- scheduled sync succeeds or records honest partial/failure state;
- retention and backup timers are active;
- latest backup has confirmed offsite object.

For the managed database cutover additionally require private network/TLS proof, complete row counts, RLS access matrix, application connection identity checks and old database read-only state.

Do not paste user/report data into public logs.

## Automatic Code Rollback

Post-switch failure triggers:

- restore previous `current` symlink;
- restore previous compatible Nginx/systemd assets;
- restore `shared/release.env`;
- restart previous web/worker runtime.

Rollback does not reverse PostgreSQL migrations/data. Migrations must be backward-compatible or have explicit recovery decision.

## Production Proof

Record outside source docs:

- deployed SHA;
- artifact checksum;
- image tag and digest;
- service/timer states;
- health/auth/isolation smoke;
- migration state;
- backup/restore result;
- rollback target.

## Recovery

Operational recovery details live in [`ops/RECOVERY.md`](ops/RECOVERY.md). DB restore is never an automatic release rollback and always requires separate owner decision.
