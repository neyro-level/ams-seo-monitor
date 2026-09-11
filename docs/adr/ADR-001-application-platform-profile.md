# ADR-001: AMS IMPULSE Platform Profile

## Status

Accepted and amended by ADR-002 and ADR-003.

## Context

AMS IMPULSE combines public SEO marketing, private multi-tenant reporting, Platform Admin and scheduled provider integrations. The project needs tenant isolation, audited admin operations, repeatable external work and limited account/operational PII handling.

## Decision

- Platform contract: `AMS Application Platform Core 3.4 — Solo Minimal`.
- `TENANCY = multi-tenant`.
- `ASYNC = outbox-plus-queue`.
- `DATA = pii`.
- `DELIVERY = own-saas`.
- `PLATFORM_ADMIN = enabled`.
- `DATABASE = managed-postgresql-target`; current self-managed PostgreSQL remains runtime only until the approved migration release.
- Runtime keeps exact TypeScript `6.0.3` as approved project exception.
- Architecture is one modular monolith on Next.js with separate web/worker processes from one immutable OCI image.
- Data owner is PostgreSQL + Prisma; no second ORM/runtime store.
- Auth owner is Better Auth for identity/password/session and AMS for Membership/permissions/resource authorization.
- Mutations use `defineAction/API/job adapter → defineCommand → transaction-bound repositories`.
- Async uses transactional OutboxEvent → pg-boss → idempotent handler.
- Public site and private cabinet keep separate design systems.
- Opaque CUID identifiers are preserved.

## Consequences

- `PrincipalContext`, tenant-aware repositories and PostgreSQL constraints jointly protect tenant data.
- Platform Admin has no fake tenant.
- No additional auth factor is an approved owner exception with compensating controls.
- Applied migrations are immutable; production uses only `prisma migrate deploy`.
- Release is tied to exact reviewed SHA and immutable image digest.
- Current self-managed PostgreSQL 18 requires private listener, separated credentials, offsite backup and restore proof until cutover.
- Target database topology and rollback are fixed in ADR-003.

## Reconsider When

Review this ADR only if platform profile, auth/data owner, async mechanism, production topology or service boundary changes.
