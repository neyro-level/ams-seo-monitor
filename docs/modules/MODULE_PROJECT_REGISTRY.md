# Module: Project Registry

## Назначение

Управляет иерархией `Organization → Project → Site`, provider mappings, profiles и готовностью конфигурации. PostgreSQL — runtime registry; `config/*` — reviewed nonsecret seed/input.

Workstream 4 делает `Project` эталонным вертикальным срезом Standard 3.0. Workstream 5 переносит Site, ProviderConnection, GoalDefinition, TrackedQuerySet, ThresholdProfile и QueryClusterProfile на те же typed Platform Admin patterns. Существующие `ProjectService`/`SiteService` остаются compatibility reads для report и worker paths до их профильной миграции; новые Project mutations через них запрещены.

## Ownership

- schema: `prisma/schema.prisma` и additive migrations `20260903190000_add_project_version`, `20260903203000_add_platform_admin_versions`;
- domain contracts: `src/modules/project-registry/domain/project.ts`;
- queries/commands/resource authorization: `src/modules/project-registry/application/project-*`;
- transaction-bound mutation repository: `PrismaProjectReferenceRepository`;
- server query repository: `PrismaProjectQueryRepository`;
- server composition: `src/modules/project-registry/infrastructure/project-reference-runtime.ts`;
- browser-safe contracts: `src/modules/project-registry/contracts.ts`;
- management routes: `/admin/projects`, `/admin/sites`, `/admin/providers`, `/admin/goals`, `/admin/tracked-queries`, `/admin/profiles`;
- seed inputs: `config/clients`, `config/goals`, `config/clusters`, `config/tracked-queries`, `config/thresholds.json`.

## Access

- `platform-admin`: global project read and mutation with an explicit target `organizationId`;
- `platform-analyst`: global project read, no mutation;
- `tenant-user / ORG_OWNER`: read and mutation only inside the server-validated active Membership organization;
- `tenant-user / ORG_MEMBER | VIEWER`: organization-scoped read, no mutation;
- `job` and `api-client`: no Project Registry capability in this slice;
- anonymous request redirects to login before data loading.

Navigation visibility is not authorization. Every query derives a scope from `PrincipalContext`; every mutation repeats permission and resource ownership checks inside the business transaction.

## Project command lifecycle

```text
Server Action
→ fresh PrincipalContext
→ defineCommand + canonical Zod input
→ permission and target organization check
→ scopedDb
→ module-owned requireProjectForAction
→ transaction-bound repository
→ Project mutation + AuditEvent
→ typed result
```

- browser input cannot select an existing Project owner or mutate `slug`;
- create requires an explicit organization and existing platform-owned threshold/cluster profiles;
- settings update changes only name and profile references;
- status update changes only `Project.status`;
- update and status commands require the current positive `version`;
- every successful update increments `version` exactly once;
- missing/foreign resources use `PROJECT_NOT_FOUND_OR_FORBIDDEN` without disclosing existence;
- concurrent update returns `PROJECT_STALE`; no mutation or audit is committed;
- unique slug and invalid profile references become stable domain errors;
- Project physical delete is outside the normal application lifecycle.

## Query and UI contract

- `listProjects`, `getProject` and `getProjectSummary` return selected browser-safe DTOs, not Prisma records;
- search covers only name and slug;
- status and sort fields use closed allowlists;
- pagination is bounded to 100 rows, with 20 rows in `/admin/projects`;
- `nuqs` owns typed server parsing of URL state;
- TanStack Table renders server-paginated data with `manualPagination`;
- desktop uses a local-scroll table; mobile uses project cards;
- create, status and settings forms use React Hook Form with shared Zod schemas;
- loading, empty, forbidden, error, success and stale-conflict states are explicit.

## Data invariants

- Project belongs to one Organization;
- `slug` is globally unique;
- `version` is `INTEGER NOT NULL DEFAULT 1` and is the optimistic concurrency token;
- Site `(projectId, slug)` remains unique;
- one ProviderConnection per `(siteId, provider)`;
- checked-in config contains no secrets;
- enabled production site does not use a placeholder URL;
- runtime navigation and routes read PostgreSQL, not JSON;
- `clientSlug`/`siteSlug` preserve the URL contract;
- enabled site is configuration-ready with two or more enabled provider connections; optional Topvisor does not break readiness;
- foreign tenant filters are applied in database queries;
- composite tenant constraints independently reject mismatched parent ownership.

## Onboarding

`pnpm project:add` creates only seed files and does not change PostgreSQL, users, memberships or production. After review, `pnpm db:seed` transfers approved input to the runtime registry.

## Verification

- Project reference slice plus typed Platform Admin resource tests;
- platform-admin/analyst/tenant-role permission matrix;
- own-tenant read and mutation where the module grants tenant scope;
- cross-tenant and anonymous denial;
- stale version conflict with no extra audit;
- successful create/update of site/provider/goal/tracked/profile mutations with one AuditEvent each;
- tracked query history preservation;
- PostgreSQL migrations and integration tests;
- URL search/status/sort/pagination behavior;
- responsive browser proof at 375, 768, 1280 and 1440 px;
- typecheck, lint and architecture guards.
