# Module: Identity and Access

## Назначение

Разделяет Better Auth identity/session lifecycle и AMS business authorization. Создаёт server-only `PrincipalContext`, first-password/2FA gates и AMS Membership roles.

## Не входит в scope

- public signup;
- self-service invitation/reset;
- impersonation;
- RLS;
- external API client;
- removal legacy plugin-compatible data before stabilization.

## Data ownership

- Better Auth: User identity, Account, Session, Verification and TwoFactor security state;
- AMS: Organization, Member, `Member.tenantRole`, business permission/resource policies and onboarding state;
- compatibility-only: `Session.activeOrganizationId`, `Member.role`, Invitation/plugin records.

## Principal types

- `platform-admin` — PLATFORM_ADMIN, no organizationId;
- `platform-analyst` — project-specific SEO_ANALYST, no fake tenant;
- `tenant-user` — fresh Membership + `ORG_OWNER | ORG_MEMBER | VIEWER`;
- `job` — explicit organizationId;
- `api-client` — reserved until a real external contract exists.

## Roles and permissions

- Platform Admin has platform permissions and must name a target organization for cross-tenant operations.
- Platform Analyst has global project/report/sync read but no platform/membership management.
- Tenant user receives only role-mapped organization permissions.
- Permission and module resource authorization are separate required checks.

## Commands

- `auth.complete-password-onboarding` clears server-owned onboarding state and appends AuditEvent after Better Auth password change;
- Platform Admin organization/membership commands use `defineAction → defineCommand` with optimistic `version`, explicit target organization and no direct CLI/UI CRUD.

## Queries

- `getPrincipalStateByUserId`;
- `getCurrentPrincipalState`;
- `getCurrentCabinetRedirect`;
- `requirePlatformAdmin`, `requirePlatformAnalyst`, `requireTenantUser`.

## DTO

Principal does not expose email, session token, password hash, TOTP secret, backup codes or raw membership records to browser code.

## Invariants

- Browser cannot construct PrincipalContext.
- Disabled user has no principal.
- Platform principals have no fake organization.
- Tenant principal requires fresh membership.
- Session active organization is only a server-side compatibility preference and is revalidated.
- `mustChangePassword=true` blocks the cabinet.
- Platform Admin requires verified TOTP in production.
- Better Auth Organization Plugin is not registered.

## Tenant behavior

Client scope derived from `Member.tenantRole` проходит через scopedDb и database-level tenant relation constraints; модуль никогда не доверяет browser organization input.

## Resource authorization

Identity module authorizes principal class. Project/report modules own concrete resource loaders.

## State lifecycle

```text
admin-created user
→ mustChangePassword
→ Better Auth password change
→ audited onboarding completion
→ cabinet

platform admin
→ TOTP enrollment
→ verified twoFactorEnabled
→ production cabinet
```

## Concurrency

Password/2FA provider state is owned by Better Auth. Onboarding completion is idempotent: an already-completed state returns `changed=false`.

## Idempotency

No external/retryable identity API exists. Future invite/webhook paths need an explicit idempotency contract.

## Audit

Password onboarding writes User audit marker. Platform Admin cross-tenant and membership commands must write explicit target organization audit in their own transaction.

## Integrations

Better Auth adapter only. No Organization Plugin, no second auth provider.

## Failure behavior

- unauthenticated → login;
- must-change-password → `/onboarding/password/`;
- production Platform Admin without 2FA → `/onboarding/two-factor/`;
- disabled/no membership tenant user → cabinet denied without tenant disclosure.

## Tests

- principal kind/permission/type guards;
- real PostgreSQL platform/analyst/tenant/no-membership factory matrix;
- first-password E2E at 375/768/1280/1440;
- required before production: real controlled TOTP enrollment and sign-in proof.
