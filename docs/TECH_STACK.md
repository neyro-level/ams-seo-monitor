# TECH STACK

## Status

Wave 0 version decision, Wave 1 foundation refresh and Wave 3 data-layer bootstrap.

Правило выбора: latest stable production-compatible release. Не использовать beta, rc, canary, nightly и dev только из-за большего номера версии.

## Current implemented baseline in this branch

По `package.json` сейчас:

- Next.js `16.3.3`;
- React `19.2.8`;
- React DOM `19.2.8`;
- TypeScript `6.0.3`;
 - Zod `4.5.4`;
 - Recharts `3.10.1`;
 - Lucide React `1.37.0`;
 - Prisma CLI `7.10.0`;
 - `@prisma/client` `7.10.0`;
 - `@prisma/adapter-pg` `7.10.0`;
 - `pg` `8.23.0`;
 - `better-auth` `1.7.2`;
 - `@better-auth/prisma-adapter` `1.7.2`;
 - `tsx` `4.23.13`;
 - pnpm `11.5.1`;
 - Node engine `>=24.20.0 <25`.

Prisma schema, initial migration files and seed tooling are already added in this branch. Better Auth runtime wiring and application authorization still belong to later waves.

## Chosen versions for backend rebuild

### Application runtime

- Node.js `24.20.0` LTS target;
- pnpm `11.5.1`;
- Next.js `16.3.3`;
- React `19.2.8`;
- React DOM `19.2.8`;
- TypeScript `6.0.3`;
- Zod `4.5.4`;
- Recharts `3.10.1`;
- ESLint `9.39.5` with `eslint-config-next` `16.3.3`.

TypeScript `7.0.2` stable was checked but rejected for this branch because current Next ESLint toolchain peers stay on `<6.1.0`; `6.0.3` is the latest stable compatible choice today.

### Data layer

- PostgreSQL `18.x` stable target line;
- Prisma CLI `7.10.0`;
- `@prisma/client` `7.10.0`.

### Auth

- `better-auth` `1.7.2`;
- `@better-auth/prisma-adapter` — matching stable release line to the selected Better Auth version.

## Why Prisma 7, not Prisma 8 RC

Repository rebuild starts from a clean backend foundation, but the version policy still forbids RC in the core stack.

Wave 0 checks show:

- `npm view prisma dist-tags --json` → `latest` points to `8.0.0-rc.12`;
- `npm view @prisma/client dist-tags --json` → `latest` points to `7.10.0`;
- Better Auth stable Prisma adapter docs explicitly state: *"This guide uses Prisma 7 and PostgreSQL."*

Decision:

- use Prisma `7.10.0` now;
- reconsider Prisma 8 only after final stable release and stable Better Auth documentation alignment.

## Why Better Auth 1.7.2

Wave 0 registry check shows:

- `npm view better-auth dist-tags --json` → `latest` is `1.7.2`;
- `beta` and `rc` tags exist separately.

Decision:

- use stable `1.7.2`, not beta/rc.

## Why PostgreSQL 18.x

Target product needs:

- relational tenant model;
- historical time-series;
- transactional sync runs;
- advisory locks;
- backup/restore;
- JSONB only for complex technical payloads.

Wave 0 server check shows:

- server OS = Ubuntu `22.04.5 LTS`;
- `psql --version` = PostgreSQL `18.4` client from PGDG;
- PostgreSQL service exists but is inactive.

Decision:

- keep PostgreSQL major `18`;
- during Wave 2 bring server to the selected stable patch line instead of introducing PostgreSQL 19 beta.

## Version resolution evidence

Wave 0 checks executed:

```bash
npm view next version
npm view next dist-tags --json
npm view prisma version
npm view prisma dist-tags --json
npm view @prisma/client version
npm view @prisma/client dist-tags --json
npm view better-auth version
npm view better-auth dist-tags --json
npm view typescript version
npm view zod version
npm view react version
```

Additional compatibility evidence:

- Better Auth Prisma adapter docs: `https://better-auth.com/docs/adapters/prisma`
- Guide explicitly uses Prisma 7 + PostgreSQL.

## Locked-version policy

- No floating dependency versions.
- Every runtime package is pinned exactly in `package.json` and lockfile.
- Major upgrades for Next, Prisma, Better Auth and PostgreSQL are deliberate architecture events, not incidental refreshes.

## Target package set for implementation

Core app:

- `next`
- `react`
- `react-dom`
- `zod`
- `better-auth`
- `@better-auth/prisma-adapter`
- `@prisma/client`

Dev/runtime tooling:

- `prisma`
- TypeScript
- ESLint / Next ESLint integration
- Vitest

Possible additions, only if justified during implementation:

- PostgreSQL driver adapter required by selected Prisma 7 setup;
- Playwright for E2E if current suite lacks coverage for auth/report flows.

## Non-goals for stack selection

Not adding for this MVP:

- Redis / Valkey;
- BullMQ / RabbitMQ / Kafka;
- ClickHouse;
- TimescaleDB;
- second ORM;
- Supabase / PocketBase / Payload / Directus;
- Docker-only local architecture if native Windows + VPS flow remains simpler.