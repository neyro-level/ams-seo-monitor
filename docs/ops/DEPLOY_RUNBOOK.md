# DEPLOY RUNBOOK

## Scope

Manual production deploy of reviewed canonical `main`. Merge, artifact build and deploy are separate gates. Этот runbook не разрешает выполнять deploy без owner-команды.

## Preconditions

- current branch = clean local `main` fast-forwarded to `origin/main`;
- exact commit SHA reviewed and Merge Gate green;
- Node runtime satisfies `scripts/verify-release-runtime.mjs`;
- lockfile matches `package.json`;
- required web/worker/migrator/backup env files exist on target;
- no secret value is printed;
- rollback target and current symlink readable.

## Build artifact

```bash
pnpm release:build
```

Artifact contains reviewed source, config seed, Prisma schema/migrations, public assets, scripts and ops files plus `release-manifest.json`. It does not package local node_modules, Windows standalone output, DB data or secrets.

Reviewed runtime assets include `seo-monitor-web`, sync worker, outbox worker and backup service/timer units.

Manifest binds:

- exact commit SHA;
- dependency lock checksum;
- target runtime/architecture;
- creation timestamp.

## Target preparation

Deploy script:

1. uploads artifact/checksum;
2. verifies SHA/checksum/manifest;
3. rejects an existing target release directory and in-place rebuild;
4. verifies all protected env files;
5. installs exact pnpm and frozen dependencies;
6. validates DB, Better Auth and exact public Leads environment through the shared Zod contracts;
7. runs `pnpm build` and `pnpm build:collector` on Linux;
8. confirms standalone public/static asset assembly;
9. applies `prisma migrate deploy` with migrator role;
10. restores runtime grants/default privileges;
11. runs reviewed seed;
12. installs backup scripts;
13. requires offsite backup upload + HEAD confirmation;
14. runs isolated restore smoke.

Any failure before symlink switch leaves current runtime untouched.

## Cutover

After successful preparation:

1. install reviewed Nginx/systemd assets;
2. arm post-switch rollback trap;
3. atomically switch `current` symlink;
4. atomically write root-owned `shared/release.env` with exact target SHA;
5. `systemctl daemon-reload`;
6. validate and reload Nginx;
7. restart web;
8. run worker once;
9. enable sync-worker, outbox and backup timers;
10. verify services/timers;
11. require loopback live/ready DTOs to report exact target SHA, ready DB/auth and typed outbox counts;
12. verify standalone server, worker and Prisma schema files;
13. record previous release and deployed SHA;
14. remove uploaded temp artifact/checksum.

## Post-deploy smoke

Required:

- public `/` = 200 and canonical metadata;
- `/ams-favicon.svg` and representative `/_next/static/*` = 200;
- `/api/health/live` = 200, valid correlation ID and exact deployed SHA;
- loopback `/api/health/ready` = 200, same SHA, PostgreSQL ready, auth configured and typed outbox counts;
- external `/api/health/ready` = 403;
- unauthenticated `/analyst/` redirects to `/?login=1`;
- analyst sign-in and report read work;
- client cannot read foreign project/site/report;
- worker run finishes and DB timestamps/status are credible;
- outbox drain service is idle-success or processes only registered events;
- sync-worker, outbox and backup timers active;
- latest backup has confirmed offsite object.

Do not paste response bodies containing user/report data into public logs.

## Automatic code rollback

Any post-switch command error triggers:

- restore previous `current` symlink;
- restore previous compatible Nginx/systemd assets;
- reload/restart previous services;
- restore `shared/release.env` to previous release SHA;
- re-enable previous timer topology where applicable.

Rollback does not reverse PostgreSQL migrations/data. A migration must be backward-compatible with the previous release or carry an explicit data recovery decision.

## Production proof

Record outside source docs:

- deployed SHA;
- artifact checksum;
- service/timer states;
- health/auth/isolation smoke results;
- migration state;
- backup/restore result;
- rollback target.

Canonical source docs never guess current deployed SHA.
