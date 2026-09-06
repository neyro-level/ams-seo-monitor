# PLATFORM CONFORMANCE

Core Standard version: `3.4 — Solo Minimal`

Conformance reviewed: `2026-09-06`

Project Profile: `multi-tenant / outbox-plus-queue / pii / own-saas / Platform Admin enabled / self-managed PostgreSQL`.

| Guarantee | State | Current evidence / gap |
|---|---|---|
| Project profile and docs canon | IMPLEMENTED | README, AGENTS, ARCHITECTURE, ADR-001, ENVIRONMENT |
| Modular monolith and import boundaries | IMPLEMENTED | module entrypoints, Dependency Cruiser, static architecture guard |
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
| SourceCraft verification contract | IMPLEMENTED | quick PR, exact-head risky, nightly daily, manual release |
| Immutable image release and rollback | IMPLEMENTED | repository release assets; live proof required per release |
| Backup/offsite/restore contract | IMPLEMENTED | scripts and runbooks exist; each release still requires current proof |
| PII/log redaction | PARTIAL | baseline redaction exists; nested log and auth rate-limit hardening remains |
| Repository client-data sanitation | NOT_IMPLEMENTED | tracked-tree cleanup and history rewrite remain |
| DateTime UTC/native-type proof | REQUIRES_CHECK | per-field audit pending in DATA_MODEL |
| Legacy Better Auth schema removal | NOT_IMPLEMENTED | allowed only after compatibility Release A and production read-only proof |

Этот файл отражает только текущее соответствие. История работ и отдельные audit reports не создаются; финальный аудит обновляет эту же таблицу.
