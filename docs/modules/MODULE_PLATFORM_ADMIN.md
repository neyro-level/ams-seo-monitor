# Module: Platform Admin

## Назначение

Platform Admin / Admin Console — защищённая внутренняя поверхность управления продуктом в `/admin/*`. Модуль не владеет доменными данными организаций, memberships, sites, providers, goals, tracked queries или profiles; он агрегирует typed navigation, summary, URL state, shared UI primitives и route composition.

## Ownership

- shared route resources: `src/modules/platform-admin/resources.ts`;
- shared page query contract: `src/modules/platform-admin/contracts.ts`;
- dashboard summary: `src/modules/platform-admin/infrastructure/dashboard-summary.ts`;
- routes and UI: `src/app/admin/*`;
- identity-owned admin commands/queries: `src/modules/identity-access/*admin*`;
- registry-owned admin commands/queries: `src/modules/project-registry/*platform-admin*`;
- operations-owned admin reads/commands: `src/modules/platform-operations/*platform-admin*`.

## Access

- only `platform-admin` may open `/admin/*`;
- `platform-analyst`, tenant users and anonymous requests do not receive Platform Admin reads or mutations;
- project route `/admin/projects` follows the same principal contract through the Project Registry reference slice.

## Route model

- `/admin/organizations/`;
- `/admin/memberships/`;
- `/admin/projects/`;
- `/admin/sites/`;
- `/admin/providers/`;
- `/admin/goals/`;
- `/admin/tracked-queries/`;
- `/admin/profiles/`;
- `/admin/operations/`.

`/admin/[resource]` is explicit typed composition. It does not use generic command registries, Refine resources or arbitrary Prisma CRUD.

## Shared UI contract

- static navigation, not Refine;
- `nuqs` parses page/search/sort/direction server-side;
- TanStack Table renders shared list rows with server pagination;
- forms use React Hook Form + Zod;
- create/update are separate typed actions;
- stale/update conflict preserves input and offers refresh;
- loading, empty, error and success states are explicit;
- client components import only browser-safe contracts.

## Mutation contract

```text
Platform Admin form
→ typed Server Action
→ fresh PrincipalContext
→ defineCommand or owned runtime command
→ module-owned resource loader
→ transaction-bound repository
→ business mutation + AuditEvent
→ typed result
```

- cross-tenant operation always carries an explicit target organization or a loaded parent resource with validated organization ownership;
- browser input does not own audit metadata, correlation ID, server-only secrets or parent ownership;
- mutable aggregates use optimistic `version` and reject stale writes.

## Security invariants

- no `@refinedev/core` dependency in runtime;
- no generic `executeAdminCommand` dispatcher;
- no Prisma or server-only imports in client graph;
- provider settings accept only flat nonsecret JSON;
- tracked query replacement preserves history through `enabled` lifecycle;
- operations enqueue keeps idempotency, audit and outbox atomic.

## Verification

- unit and PostgreSQL integration coverage for identity, registry and operations command paths;
- browser proof on 375, 768, 1280 and 1440 px;
- public landing remains unchanged;
- HEAVY profile covers typecheck, lint, architecture, integration, build and E2E.
