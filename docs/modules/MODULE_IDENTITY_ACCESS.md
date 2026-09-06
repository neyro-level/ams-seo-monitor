# Module: Identity Access

## Назначение

Разделяет Better Auth identity/session lifecycle и AMS business authorization. Создаёт server-only `PrincipalContext`, first-password/2FA gates и Membership roles.

## Не входит в scope

Public signup, self-service invitation/reset, impersonation, RLS, external API clients и schema cleanup внутри обычной auth-задачи.

## Data ownership

- Better Auth: User identity, Account, Session, Verification, TwoFactor;
- AMS: Organization, Member.tenantRole, permissions, onboarding state;
- deprecated only: Session.activeOrganizationId, Member.role, Invitation.

## Principal types

`platform-admin`, `platform-analyst`, `tenant-user`, `job`; `api-client` зарезервирован до появления внешнего API.

## Roles and permissions

- PLATFORM_ADMIN: platform management, explicit cross-tenant target, mandatory production 2FA;
- SEO_ANALYST: project/report/sync read, no Platform Admin access;
- ORG_OWNER/ORG_MEMBER/VIEWER: organization-scoped permissions from fresh Membership.

## Commands

`auth.complete-password-onboarding` и identity-owned Platform Admin user/membership commands. Business writes use `defineCommand` and AuditEvent.

## Queries

`getPrincipalStateByUserId`, `getCurrentPrincipalState`, `getCurrentCabinetRedirect`, exact-principal guards и identity admin queries.

## DTO

Principal and identity DTOs exclude email where unnecessary, session token, password hash, TOTP secret, backup codes and raw Member records.

## Invariants

- browser never constructs PrincipalContext;
- disabled user has no principal;
- platform principals have no fake organization;
- tenant principal requires fresh active Membership;
- Better Auth Organization Plugin is absent from runtime;
- public signup is disabled;
- `ActorContext` is a deprecated read-only compatibility boundary.

## Tenant behavior

Tenant scope comes only from fresh Membership. Session active organization is a revalidated server-side preference, not authority.

## Resource authorization

Identity Access authorizes principal class; owner modules authorize Project/Site/report resources.

## State lifecycle

```text
operator-created user
→ mustChangePassword
→ Better Auth password change
→ audited onboarding completion
→ cabinet

PLATFORM_ADMIN
→ TOTP enrollment
→ verified 2FA
→ production cabinet
```

## Concurrency

Better Auth owns credential/2FA concurrency. Onboarding completion is idempotent and returns `changed=false` when already complete.

## Idempotency

No external identity API exists. Retried AMS commands must use their command-level idempotency contract where applicable.

## Audit

Password onboarding and every Platform Admin cross-tenant/membership mutation write safe AuditEvent markers.

## Events / Async policy

Identity flows do not emit provider side effects. Future delivery/invitation needs a separate outbox topic and schema.

## Integrations

Better Auth `1.7.2` only; no second auth provider or Organization Plugin.

## Failure behavior

Unauthenticated → login; password setup → `/onboarding/password/`; missing admin 2FA → `/onboarding/two-factor/`; disabled/no-membership → denial without tenant disclosure.

## Tests

Principal/permission unit tests, real-PostgreSQL factory matrix, first-password and TOTP E2E, foreign/no-membership denial.
