# PLATFORM CONFORMANCE

Core Standard version: `3.4 — Solo Minimal`

Conformance reviewed: `2026-09-06`

Project Profile: `multi-tenant / outbox-plus-queue / pii / own-saas / Platform Admin enabled / self-managed PostgreSQL`.

| Guarantee | State | Current evidence / gap |
|---|---|---|
| Project profile and docs canon | IMPLEMENTED | README, AGENTS, ARCHITECTURE, ADR-001, ENVIRONMENT |
| Modular monolith and import boundaries | IMPLEMENTED | module entrypoints, Dependency Cruiser, static guard and bounded Platform Admin resource adapters |
| PostgreSQL/Prisma source of truth | IMPLEMENTED | Prisma 7 schema, immutable migrations, repository boundaries |
| Self-managed PostgreSQL 18 | APPROVED_PROJECT_EXCEPTION | approved in ADR-001; live topology audited before release |
| Managed PostgreSQL | NOT_APPLICABLE | no migration target or backlog |
| TypeScript 6.0.3 | APPROVED_PROJECT_EXCEPTION | exact lockfile version retained in ADR-001 |
| Authentication and production Platform Admin 2FA | IMPLEMENTED | one-time hashed setup capability, fresh cabinet boundary, TOTP enrollment and single-use Better Auth backup-code recovery |
| PrincipalContext authorization | IMPLEMENTED | all private reads/actions use the discriminated principal; legacy facade is statically forbidden |
| Multi-tenant ownership and DB constraints | IMPLEMENTED | tenant registry, scoped repositories, composite constraints and isolation tests |
| `defineAction → defineCommand` mutations | IMPLEMENTED | centralized action boundary and transaction-owned commands |
| Async outbox + pg-boss | IMPLEMENTED | deterministic dispatch, idempotency, leases, bounded retry/dead-letter |
| Persistent worker heartbeat/readiness | IMPLEMENTED | RuntimeHeartbeat is the sole worker-liveness input |
| Seed/config boundary | IMPLEMENTED | safe bootstrap, private-path dry-run/apply, no deploy import |
| Environment registry and validation | IMPLEMENTED | explicit datasource, isolated environment identities and safe target summary |
| SourceCraft verification contract | IMPLEMENTED | ordinary PR runs only `verify:quick`; exact-head risky, nightly daily and manual release workflows are defined |
| SourceCraft secret scanning | REQUIRES_CHECK | scanner is required by Core 3.4, but platform-side enablement was not independently confirmed |
| Immutable image release and rollback | IMPLEMENTED | compatibility Release A deployed exact SHA `e20f6f885fdd9e53d0d5d7388c252b43ea94e155` as one immutable image for web/worker; rollback path was exercised during failed pre-release attempts |
| Backup/offsite/restore contract | IMPLEMENTED | Release A confirmed checksum, private offsite object and isolated restore smoke before migration |
| PII/log redaction | IMPLEMENTED | nested user/actor/payload/header fields are redacted and serialized-log tested; Better Auth 1.7.2 login/2FA rate limits are explicit |
| Repository client-data sanitation | IMPLEMENTED | tracked tree and rewritten canonical refs contain only synthetic examples/fixtures and are protected by a signature verifier |
| GitHub public mirror sanitation | REQUIRES_CHECK | cleaned `main` may be mirrored while private, but an old pre-rewrite SHA remains directly accessible; public visibility is blocked until GitHub confirms purge |
| DateTime UTC/native-type proof | PARTIAL | all 87 fields are mapped in DATA_MODEL: 20 proven UTC instants migrated, 6 civil timestamps retained, 61 fields remain `REQUIRES_CHECK` without speculative conversion |
| Legacy Better Auth schema removal | IMPLEMENTED | Release A stopped compatibility reads; production data was verified read-only and a new contract migration removes only proven-unused fields/table |
| Production PostgreSQL topology | IMPLEMENTED | PostgreSQL 18.6, loopback-only listener, runtime/migrator boundaries, pg-boss ownership, capacity, locks, timers, backup and restore were audited read-only |
| Production DB least privilege | PARTIAL | runtime role has no DDL; migration role still has `CREATEDB`, so narrowing that grant remains `REQUIRES_CHECK` |
| Production controlled TOTP login proof | REQUIRES_CHECK | integration/E2E cover the policy; a live credentialed enrollment/login/recovery exercise is still required without exposing credentials |
| Final Release B | NOT_IMPLEMENTED | exact-head release gate, contract/DateTime migrations, immutable rollout and final live proof remain |

Этот файл отражает только текущее соответствие. История работ и отдельные audit reports не создаются; финальный аудит обновляет эту же таблицу.
