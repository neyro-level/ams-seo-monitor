# TECH STACK

> Migration status: the version table below is the current runtime, not full Standard 3.0 conformance. Refine removed in Workstream 5; pg-boss, pino and Docker enter only in their named workstreams.

## Source of truth

`package.json` и `pnpm-lock.yaml` определяют фактические package versions. Floating versions запрещены.

## Runtime

| Слой | Версия / выбор | Назначение |
|---|---|---|
| Node.js | `>=24.20.0 <25` | web, worker, scripts |
| pnpm | `11.5.1` | reproducible install |
| Next.js | `16.3.3` | App Router standalone server |
| React / React DOM | `19.2.8` | UI |
| TypeScript | `6.0.3` | strict ESM application/worker types |
| Zod | `4.5.4` | DTO/config validation |
| Prisma / `@prisma/client` | `7.10.0` / `7.10.0` | explicit generated client, schema, migrations, repositories |
| PostgreSQL | `18.x` | runtime source of truth |
| Better Auth | `1.7.2` | identity/password/session; Organization Plugin remains legacy until Workstream 2 |
| pg / Prisma pg adapter | `8.23.0` / `7.10.0` | PostgreSQL transport |
| Tailwind CSS | `4.3.3` | styles |
| Recharts | `3.10.1` | report charts |
| Lucide React | `1.37.0` | icons |
| Vitest | `4.1.11` | unit/real-PostgreSQL integration tests |
| Playwright | `1.62.1` | production-like E2E and responsive contracts |
| Dependency Cruiser | `18.2.0` | executable import boundaries |

## Build contract

- `next.config.ts`: `output: "standalone"`, `poweredByHeader: false`;
- `.node-version`: exact `24.20.0` для local/CI/release parity;
- `pnpm build`: Prisma generate → config verification → Next build → standalone asset assembly;
- `scripts/prepare-standalone.mjs` copies `public/` and `.next/static/` into `.next/standalone`;
- `pnpm build:collector`: Prisma generate + `tsconfig.collector.json`;
- `package.json`: `"type": "module"`; all local TypeScript imports use source `.ts` extensions and collector emit rewrites them to `.js`;
- Prisma generator: `prisma-client`, explicit `src/generated/prisma` output, ESM and generated `.ts` import extensions;
- generated Prisma client is ignored and recreated by `pnpm prisma:generate`; it is never edited manually;
- Linux release installs dependencies strictly from lockfile before build.

## Version policy

- exact package pins;
- no beta/rc/canary/nightly in production baseline;
- Next/React/TypeScript/Prisma/Better Auth major changes are separate architecture work;
- package and lockfile always change together;
- compatibility is proven by typecheck, lint, tests, build and affected runtime smoke;
- production Node version must satisfy `scripts/verify-release-runtime.mjs`.

## Standard 3.0 dependency migration

- current runtime uses React Hook Form, TanStack Table and `nuqs` in private admin surfaces;
- Refine removed in Workstream 5; Platform Admin now relies on typed route composition and shared primitives instead of a resource framework;
- TanStack Table and `nuqs` are the canonical private list patterns after the Project reference slice and Platform Admin rewrite;
- pg-boss `12.30.0` entered in Workstream 6 with reviewed schema/pool/runbook contract;
- pino `10.3.1` entered in Workstream 7 with redaction and correlation callsites;
- Sentry remains disabled until SECURITY records a compliant DSN/proof path;
- production Docker assets enter only with the reviewed topology workstream.

Пустые platform dependencies без callsites запрещены.

## Deliberate exclusions

Текущему продукту не нужны второй ORM/backend/auth, Redis, ClickHouse, TimescaleDB или Kubernetes. pg-boss, pino, TanStack Table, nuqs и Docker добавляются только в named Standard 3.0 workstreams; остальные dependencies требуют доказанного contract gap или ADR.
