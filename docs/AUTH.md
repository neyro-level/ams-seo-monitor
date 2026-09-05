# AUTH

## Статус

Standard 3.0 identity foundation реализован. Приложение всё ещё предоставляет legacy `ActorContext` отдельным reporting/project compatibility reads; новый auth, onboarding и authorization code использует `PrincipalContext`.

## Ownership

Better Auth `1.7.2` owns:

- identity, credential password and session lifecycle;
- username sign-in;
- TOTP two-factor authentication and backup codes.

AMS owns:

- Organization;
- Membership and tenant role;
- business permissions;
- resource visibility;
- onboarding state;
- audit of AMS business state.

Better Auth Organization Plugin is removed from runtime. Existing `Session.activeOrganizationId`, `Member.role` and plugin-compatible tables remain only through the compatibility release period. They are never accepted without a fresh AMS Membership check.

## PrincipalContext

```text
platform-admin    → PLATFORM_ADMIN, no organizationId
a platform-analyst → SEO_ANALYST, no fake tenant context
tenant-user       → userId + membershipId + organizationId + ORG_OWNER|ORG_MEMBER|VIEWER
job               → jobName + explicit organizationId
api-client        → reserved until external /api/v1 exists
```

Factories are server-only:

```text
getPrincipalStateByUserId()
getCurrentPrincipalState()
requirePlatformAdmin()
requirePlatformAnalyst()
requireTenantUser()
createJobPrincipal()
```

Browser values never construct a principal. The only compatibility input is `Session.activeOrganizationId` read from the server-side session record and validated against current AMS Membership.

## Roles and permissions

- `PLATFORM_ADMIN` is an internal non-tenant principal. Cross-tenant action must name a target organization and record audit.
- `SEO_ANALYST` is project-specific `platform-analyst`: global project/report/sync read, not Platform Admin.
- client users become `tenant-user` through `Member.tenantRole`:
  - `ORG_OWNER`;
  - `ORG_MEMBER`;
  - `VIEWER`.

Permission answers whether an action class is permitted. Module resource authorization answers whether the principal may act on the particular project/site/report. Both are required in migrated modules.

## First password and 2FA

`user:create` creates `mustChangePassword=true`.

Until password onboarding completes, private cabinet routes redirect to `/onboarding/password/`. Password change uses Better Auth; a server-owned `defineCommand` then clears the onboarding flag, revokes other sessions through Better Auth and writes `AuditEvent`.

`PLATFORM_ADMIN` has TOTP enrollment at `/onboarding/two-factor/`. The production policy requires 2FA before cabinet access. `AMS_E2E_TEST=true` is local Playwright-only test isolation and must never be set in production runtime.

Two-factor plugin schema:

- `User.twoFactorEnabled`;
- `TwoFactor.secret`;
- encrypted `backupCodes`;
- verification and account-lockout state.

## Provisioning commands

```bash
<secret-provider> | pnpm user:create -- --username <name> --name <display-name> --system-role PLATFORM_ADMIN
pnpm user:disable -- --username <name>
pnpm user:set-system-role -- --username <name> --system-role SEO_ANALYST
pnpm user:add-to-organization -- --username <name> --organization <slug> --tenant-role VIEWER
pnpm user:remove-from-organization -- --username <name> --organization <slug>
```

Passwords use bounded stdin, never argv. `--tenant-role` accepts `ORG_OWNER`, `ORG_MEMBER` or `VIEWER`; legacy `--role` remains compatibility-only.

## Migration contract

Migration `20260903164000_add_principal_auth_foundation` is additive:

- adds `MembershipRole` and `Member.tenantRole` default `VIEWER`;
- adds `User.mustChangePassword` default `false` so existing production users are not silently locked out;
- adds Better Auth 2FA fields/model;
- does not delete plugin-compatible fields/tables.

Tenant ownership backfill и composite constraints реализованы. Удаление оставшихся legacy compatibility fields остаётся отдельным post-stabilization contract release.

## Entry points

- `src/platform/auth/auth.ts` — Better Auth server adapter;
- `src/platform/auth/client.ts` — Better Auth client adapter;
- `src/platform/auth/principal-session.ts` — current session → PrincipalContext;
- `src/platform/authorization/principal.ts` — discriminated types and permissions;
- `src/platform/authorization/principal-factories.ts` — server factories;
- `src/platform/auth/complete-password-onboarding.ts` — audited onboarding command;
- `src/app/onboarding/*` — first-password and TOTP surfaces;
- `src/modules/identity-access/*` — temporary legacy ActorContext facade for unrevised modules.

## Proof

- unit: principal kind/permission/type guards;
- integration: migrations, platform/analyst/tenant/no-membership principal factories;
- E2E: login, first-password redirect/completion and private cabinet access at 375/768/1280/1440;
- required before production: real TOTP controlled enrollment/login proof with a provisioned test Platform Admin.
