# TECH STACK

## Source of truth

`package.json` и `pnpm-lock.yaml` определяют фактические package versions. Floating versions запрещены.

## Runtime

| Слой | Версия / выбор | Назначение |
|---|---|---|
| Node.js | `>=24.20.0 <25` | web, worker, scripts |
| pnpm | `11.5.1` | reproducible install |
| Next.js | `16.3.3` | App Router standalone server |
| React / React DOM | `19.2.8` | UI |
| TypeScript | `6.0.3` | strict application/worker types |
| Zod | `4.5.4` | DTO/config validation |
| Prisma | `7.10.0` | schema, migrations, repositories |
| PostgreSQL | `18.x` | runtime source of truth |
| Better Auth | `1.7.2` | session/auth/organization plugin |
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
- Linux release installs dependencies strictly from lockfile before build.

## Version policy

- exact package pins;
- no beta/rc/canary/nightly in production baseline;
- Next/React/TypeScript/Prisma/Better Auth major changes are separate architecture work;
- package and lockfile always change together;
- compatibility is proven by typecheck, lint, tests, build and affected runtime smoke;
- production Node version must satisfy `scripts/verify-release-runtime.mjs`.

## Planned, not installed yet

- Refine Core, shadcn/ui и React Hook Form — добавляются вместе с первым рабочим Admin CMS resource;
- Sentry — добавляется в observability phase с PII scrubbing и release markers.

Пустые platform dependencies без callsites запрещены.

## Deliberate exclusions

Текущему продукту не нужны второй ORM/backend/auth, Redis, queue broker, ClickHouse, TimescaleDB или Kubernetes. Новая dependency добавляется только для доказанного contract gap.
