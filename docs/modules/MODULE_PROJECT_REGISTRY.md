# Module: Project Registry

## Назначение

Управляет иерархией `Organization → Project → Site`, provider mappings, profiles и готовностью конфигурации. PostgreSQL — runtime registry; `config/*` — reviewed nonsecret seed/input.

## Ownership

- schema: `prisma/schema.prisma`;
- seed inputs: `config/clients`, `config/goals`, `config/clusters`, `config/tracked-queries`, `config/thresholds.json`;
- validation: `scripts/verify-config.mjs`, `src/shared/schemas/registry.ts`;
- seed: `scripts/seed-database.ts`;
- reads: `PrismaProjectRepository`, `PrismaMonitoringRepository`;
- services: `ProjectService`, `SiteService`, `MonitoringService`.

## Access

- `SEO_ANALYST`: все projects/sites;
- `CLIENT_VIEWER`: только memberships своей organization;
- worker: enabled projects/sites/provider connections;
- browser не изменяет registry.

## Invariants

- Project `slug` уникален глобально;
- Site `(projectId, slug)` уникален;
- one ProviderConnection per `(siteId, provider)`;
- checked-in config не содержит secrets;
- enabled production site не использует placeholder URL;
- runtime navigation и routes читают DB, не JSON;
- clientSlug/siteSlug сохраняют URL contract;
- enabled site считается configuration-ready при двух или более enabled provider connections; optional Topvisor не должен ломать этот статус;
- foreign tenant filter применяется в DB query.

## Onboarding

`pnpm project:add` создаёт только seed files и не меняет PostgreSQL, users, memberships или production. После review `pnpm db:seed` переносит input в runtime registry.

## Проверки

- duplicate/collision/placeholder/config reference validation;
- no overwrite и dry-run project wizard;
- seed idempotency;
- analyst/client tenant matrix;
- configuration readiness при 2 и 3 enabled sources;
- disabled planned site state.
