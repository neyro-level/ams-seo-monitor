# Module: Project Registry

## Назначение

Хранит seed/input материалы для projects, sites, goal profiles, tracked queries и cluster profiles. В production runtime registry уже читается из PostgreSQL, а не напрямую из checked-in JSON.

## Current ownership

- seed/input files in `config/*`
- DB-backed project/site/provider records in PostgreSQL
- seed script `scripts/seed-database.ts`
- runtime project access through `PrismaProjectRepository`

## Invariants

- checked-in config остаётся nonsecret;
- `clientSlug` и `siteSlug` semantics сохраняются;
- runtime routes and navigation now read PostgreSQL-backed repositories;
- config files are no longer the production source of truth.

## Current checks

- `pnpm verify:config`
- `pnpm db:seed`
- repository/service integration tests
