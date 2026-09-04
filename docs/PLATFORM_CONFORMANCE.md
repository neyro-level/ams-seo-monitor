# PLATFORM CONFORMANCE

## Назначение

Project gap register для `AMS Application Platform Core Standard 3.0` от 2026-09-03.

Это не второй roadmap. Порядок работ и branch stack находятся в `docs/MASTER_PLAN.md`. Фактическое состояние определяют `package.json`, lockfile, Prisma schema/migrations, runtime code, tests и проверяемый production.

Статусы:

- `KEEP` — соответствует и сохраняется;
- `MIGRATE` — работоспособный legacy contract, который должен быть заменён clean cutover;
- `ADD` — обязательная гарантия отсутствует;
- `VERIFY` — требуется external/production proof;
- `N/A` — стандартная возможность не нужна продукту.

## Product adaptation

AMS IMPULSE — публичный SEO landing + приватная multi-tenant отчётность + внутренняя Platform Admin surface.

Применяются:

- modular monolith;
- server-first Next.js;
- PrincipalContext;
- AMS-owned Membership/RBAC;
- scopedDb и tenant constraints;
- defineCommand/defineAction;
- shadcn/TanStack/nuqs/RHF/Zod private UI patterns;
- transactional outbox + pg-boss;
- pino, optional compliant Sentry, health and CI;
- immutable Docker image + Compose + host Nginx + Managed PostgreSQL.

Не применяются без нового product trigger:

- Contact/CRM pipeline/kanban/tasks;
- billing/payment;
- public signup;
- external `/api/v1`, ApiClient и OpenAPI;
- user files/object storage;
- realtime;
- Redis;
- search engine;
- RLS;
- generic template repository.

`SyncRun`/`SourceRun` являются project-specific import lifecycle вместо generic `ImportRun`. CUID сохраняется как approved opaque existing identifier; массовый re-key запрещён.

## Принципиальные расхождения

| Область | Current `origin/main` | Standard 3.0 | Status | Решение |
|---|---|---|---|---|
| Source of truth | зрелый hybrid canon, conformance v1 | canonical v3 docs roles | MIGRATE | нормализовать SECURITY/deploy canon и supersede v1 ADR |
| Runtime | Node 24, Next 16 standalone | тот же runtime внутри OCI image | KEEP/MIGRATE | сохранить application runtime, заменить release topology |
| TypeScript | strict app/collector/tests | strict ESM | MIGRATE | проверить ESM collector и Prisma generated output |
| Prisma generator | `prisma-client-js`, implicit output | Prisma 7 `prisma-client`, explicit output | MIGRATE | отдельный runtime workstream |
| PostgreSQL | Prisma 7 + PostgreSQL 18 | PostgreSQL 18 + driver adapter | KEEP | сохранить versions и migration history |
| IDs | CUID | UUIDv7 или approved opaque ID | KEEP | CUID formally approved для existing product records |
| Module boundaries | seven vertical modules | vertical modules + public API | KEEP | усилить server-only/global Prisma/static guards |
| Module contracts | partial legacy module docs | full Standard 3.0 ownership/principal/command/query/tenancy contract | MIGRATE | обновлять профильный module doc вместе с его workstream |
| Platform folders | shared DB/composition under `src/infrastructure` | canonical `src/platform/*` | MIGRATE | clean path migration без второго runtime |
| Auth identity | Better Auth username/session | Better Auth identity/password/session/2FA | KEEP/ADD | сохранить adapter, добавить first-password + 2FA |
| Organization tenancy | Better Auth Organization Plugin + AMS services | plugin запрещён, AMS owns tenancy | MIGRATE | удалить plugin runtime, retain DB compatibility until contract release |
| Request context | aggregate `ActorContext` with memberships | discriminated `PrincipalContext` | MIGRATE | platform-admin/platform-analyst/tenant-user/job factories |
| Tenant roles | global `SEO_ANALYST`, `CLIENT_VIEWER` system roles | tenant `ORG_OWNER/ORG_MEMBER/VIEWER` | MIGRATE | client access перенести в Membership; analyst остаётся explicit platform principal |
| Resource authorization | capability + repository filters | permission + module-owned resource loader | ADD | `require<Project|Site|...>ForAction` per module |
| scopedDb | unrestricted global client inside repositories | scoped DB context + transaction proof | ADD | platform database boundary and integration matrix |
| Tenant columns | Project has organizationId; descendants derive through relations | every tenant-owned model explicit | ADD | additive backfill and composite constraints |
| Composite tenant FKs | mostly single-column relations | tenant-aware FK/unique | ADD | generated + reviewed SQL migrations |
| Nested tenant writes | present in Prisma upsert/create paths | prohibited | MIGRATE | explicit repository operations inside command transaction |
| Raw SQL | `$queryRawUnsafe("select 1")` exists | unsafe raw SQL prohibited | MIGRATE | replace immediately and add static guard |
| Mutations | services + generic `executeAdminCommand` transport | defineAction → defineCommand | MIGRATE | Project reference slice then rollout |
| Transaction owner | repository methods own transactions | defineCommand owns business transaction | MIGRATE | transaction-bound repositories |
| Concurrency | no uniform optimistic policy | explicit version/expected state | ADD | Project first, remaining mutable entities by lifecycle |
| Audit/outbox | foundation implemented | command-owned atomic audit/outbox | KEEP/MIGRATE | reuse schema, move ownership to defineCommand |
| Outbox payload | topic/payload/status, no schemaVersion/occurredAt | versioned bounded payload | ADD | additive fields + Zod/size guard |
| Queue | custom direct PostgreSQL dispatcher | outbox → pg-boss → handler | MIGRATE | separate pg-boss pool/schema lifecycle |
| Worker principal | implicit system execution | JobPrincipal with organizationId | ADD | scoped job adapter |
| Sync/import lifecycle | SyncRun/SourceRun | ImportRun guarantees | KEEP/MIGRATE | extend domain-specific runs with tenant/correlation/statistics |
| Private list UI | TanStack Table + nuqs on Project and Platform Admin routes | TanStack Table + nuqs | KEEP/MIGRATE | preserve server filtering and route-owned state |
| Forms | RHF/Zod + typed Server Actions on Project and Platform Admin routes | RHF UX + server canonical Zod | KEEP/MIGRATE | extend to remaining modules without generic dispatcher |
| Refine | removed from runtime in Workstream 5 | forbidden without ADR | REMOVE | no justified value |
| Public UI | project-specific AMS IMPULSE design | product design not universal platform | KEEP | freeze composition/CTA/tokens |
| Logs | redacted pino JSON for worker/web error paths | pino JSON + redaction | PROVEN | keep expanding callsites, no plaintext secrets |
| Correlation | auth/health/audit/outbox/job partial propagation | boundary-to-provider propagation | PARTIAL | finish provider-call edge and wider tests |
| Sentry | explicitly disabled without DSN/proof | conditional on compliance | VERIFIED_DISABLED | no fake connected state |
| Health | live/ready + DB/auth/outbox/worker/freshness | heartbeat/queue/integration freshness | PROVEN | preserve public-safe DTO |
| Unit/integration/E2E | Vitest, real PG, responsive Playwright | same + wider matrices | KEEP/ADD | add observability regression tests |
| Architecture QA | Dependency Cruiser boundaries | cruiser + static guards | ADD | unsafe raw/global Prisma/tenant registry/server-client guards |
| CI | PR check + merge-fast/merge-heavy exact-head workflows | PR checks include risk-required tests | PARTIAL | CI profile defined; live SourceCraft run still owner-verified |
| Production artifact | source archive built on target host | immutable OCI image built outside host | MIGRATE | multi-stage Dockerfile + registry digest |
| Production processes | systemd web/oneshot workers | Compose web + worker from one image | MIGRATE | host Nginx remains, worker becomes long-running queue runtime where required |
| Database network | documented local/private, exact live topology not canonical | private Timeweb Managed PostgreSQL | VERIFY | inspect provider/network before infra implementation |
| DB identities | app/migrator partially separated | runtime/migration/pg-boss separation | VERIFY/ADD | confirm Timeweb permissions and compensate via ADR if limited |
| Connection budget | not fully documented | explicit web/worker/pg-boss/reserve budget | ADD | measure before production cutover |
| Release | exact SHA + symlink rollback | exact SHA + image digest + migration steps | MIGRATE | blue/green-compatible container rollout |
| Backup/restore | offsite backup + restore smoke | RPO/RTO + periodic proof | KEEP/ADD | preserve tooling, define RPO/RTO and image-era runbook |

## Hard blockers before new production

1. Better Auth Organization Plugin removed from runtime.
2. PrincipalContext and AMS Membership authorization active.
3. Platform Admin protected by 2FA and first-password lifecycle.
4. Tenant ownership/backfill/composite constraints proven on real PostgreSQL.
5. scopedDb transaction behavior and full negative isolation matrix green.
6. Business writes use defineCommand; generic dispatcher removed from runtime.
7. pg-boss schema/pool/runtime migration contract proven.
8. pino redaction and health heartbeat/queue/freshness proven.
9. SourceCraft HEAVY runs required DB/security profile reproducibly.
10. Immutable image/Compose/Managed PostgreSQL topology and rollback rehearsed.

## Deliberate decisions

### SEO_ANALYST

`SEO_ANALYST` is not converted into a fake tenant member and does not become Platform Admin. It becomes a project-specific `platform-analyst` principal with explicit global read/sync permissions. Every cross-tenant query remains intentional and test-covered.

### Existing IDs

Existing CUID values remain. They are opaque and not authorization. New mass UUID migration would add risk without product value. Any future ID policy change requires ADR and compatibility plan.

### Profiles

Threshold/cluster profiles may remain platform-owned only while Platform Admin exclusively manages them and cross-tenant reuse is intentional. If tenant users receive management rights, profiles must gain organization ownership before that feature.

### RLS

Not part of this rewrite. scopedDb + resource authorization + composite tenant constraints are implemented first. RLS remains an ADR-triggered defensive layer.

### Sentry

Sentry is not automatically enabled. SECURITY must record compliance/data-location decision. `connected` requires real project/DSN, controlled event, flush and external confirmation.

### Database contract removal

Legacy Better Auth/plugin and denormalized compatibility fields are not dropped in the first common release. Removal is a later contract release after stabilization.

## Proof source

Completion evidence belongs in PR checks, migration logs, tests and release proof—not in optimistic status labels here. `docs/MASTER_PLAN.md` is updated only when workstream scope or ordering changes.
