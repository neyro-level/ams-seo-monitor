# SECURITY

Security boundary for AMS IMPULSE profile: `multi-tenant / pii / own-saas / Platform Admin enabled`.

## Trust Boundaries

### Browser

Receives only public HTML or explicit browser-safe DTOs. It must never receive Prisma records, database URLs, provider credentials, raw provider payloads, password hashes, session tokens, backup credentials, stack traces or internal error bodies.

### Next.js Web

- Better Auth validates identity/password/session.
- Server rebuilds fresh `PrincipalContext` for every private request/action.
- Disabled User or removed Membership loses access on next request.
- Public signup and user-created organizations are disabled.
- Public errors use stable code, safe message and correlation ID.
- `/api/health/ready` is loopback-only.

### PostgreSQL

- Single runtime source of truth.
- No public Internet listener.
- Runtime, migrator, test and backup identities are separated.
- Tenant-owned records carry explicit `organizationId`.
- Composite constraints reject cross-tenant parent relations.
- Production schema changes use reviewed migrations only.
- Backup/offsite/restore proof is required before release migration.

### Worker And Providers

- Provider tokens exist only in worker/server environment.
- Yandex Webmaster and Yandex Metrika are read-only.
- Topvisor writes are allowed only inside bounded idempotent worker contracts.
- Browser never calls providers directly.
- Provider settings in DB contain nonsecret mappings only.
- Price-check is mandatory before paid Topvisor checker.
- Logs contain safe IDs, counts and statuses; no token, header, raw body or PII.

### Leads API

Public lead form submits to allowlisted external AMS Leads API. AMS IMPULSE does not store name/phone in its PostgreSQL. `NEXT_PUBLIC_LEADS_*` values are public identifiers, not delivery credentials.

## Identity Contract

Better Auth `1.7.2` owns identity, password credential and session lifecycle. AMS owns Membership, permissions, resource authorization and AuditEvent.

Effective principals:

```text
platform-admin   → PLATFORM_ADMIN, no organizationId
platform-analyst → SEO_ANALYST, no fake tenant
tenant-user      → userId + membershipId + organizationId + tenantRole
job              → jobName + explicit organizationId
```

Browser, URL, form and cookie do not create tenant scope.

## Login And Password Policy

- Login uses unique lowercase username and operator-assigned password.
- Password is exactly 8 printable ASCII characters without spaces.
- Only Platform Admin/operator CLI assigns or resets password.
- Plain password is never returned after save.
- Reset revokes existing sessions.
- Self-service registration, password recovery and user password change are out of scope.
- No additional factor is an approved owner exception.

Compensating controls: HTTPS/HSTS, closed signup, Better Auth rate limit, server-side authorization, disabled-user boundary, session revocation and AuditEvent.

## Authorization Rules

- Knowledge of slug/URL is not access.
- Navigation hiding is not authorization.
- Permission and module-owned resource authorization are both required.
- Platform Admin must explicitly name target organization for cross-tenant operation.
- Tenant user can read only its fresh Membership organization.
- Direct Server Action calls must pass the same checks as UI flows.
- Worker `JobPrincipal` organization must match queued event/target.

## Secrets

Secret sources: approved Doppler scope and root-owned protected server env files.

Secrets include Better Auth secret, DB credentials, provider tokens, Topvisor API key, backup credentials and external delivery credentials. They are forbidden in Git, fixtures, build output, docs, browser, argv, logs, AuditEvent and public error responses.

Server-only secrets must not use `NEXT_PUBLIC_*`. Secret rotation runbook: [`ops/TOKEN_ROTATION.md`](ops/TOKEN_ROTATION.md).

## PII And Logging

- User/session may include email, IP and user-agent only in auth/server layer.
- Lead PII is not stored in this database.
- Production PII is not used in fixtures.
- Raw provider errors and response bodies are not persisted.
- Notifications use safe title/message/route only.
- Pino redaction covers root and nested password/token/secret/cookie/API key/email/phone fields.
- Serialized-log tests must keep sentinel secrets out of output.

## Mutations And Audit

Business mutations follow:

```text
defineAction/API/job adapter
→ fresh PrincipalContext
→ defineCommand
→ permission + resource authorization
→ transaction-bound repositories
→ mutation + safe AuditEvent + optional OutboxEvent
```

External provider calls are outside the business DB transaction. Successful admin/user/provider configuration mutations write one safe AuditEvent atomically with the mutation.

## Security Invariants

- Public signup off.
- `PrincipalContext` is the only authorization input.
- Foreign tenant read/write denied in application and blocked by DB constraints.
- UI does not import Prisma/SQL.
- Provider settings reject sensitive key names.
- Secret/PII absent from DTOs, logs, AuditEvent and error responses.
- Integration runner accepts only dedicated `*_test` database.
- Production deploy uses exact reviewed SHA and immutable image digest.

## Open Security Work

Tracked in [`MASTER_PLAN.md`](MASTER_PLAN.md):

- independent confirmation of SourceCraft secret scanning;
- GitHub mirror sanitation before public visibility;
- narrowing production migrator `CREATEDB` after owner-approved impact scope;
- external monitor for public health/stale integrations without exposing readiness body.
