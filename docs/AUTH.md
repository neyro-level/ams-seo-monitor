# AUTH

## Статус

Canonical auth/authorization code использует только `PrincipalContext`.

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

Better Auth Organization Plugin отсутствует в runtime. `Session.activeOrganizationId`, `Member.role` and `Invitation` remain deprecated schema compatibility fields. They do not define permissions and are never accepted without a fresh AMS Membership check.

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

`user:create` creates a user without a credential account and issues a 32-byte one-time setup token. PostgreSQL stores only its SHA-256 hash, 24-hour expiry, used/revoked timestamps and explicit operator identity. The CLI prints the raw token once as `/setup/#<token>`; the URL fragment is removed by the browser before submission and is never sent in an HTTP request or access-log path.

The server-only Better Auth setup endpoint applies the installed password policy and Better Auth password hashing. Credential account creation, atomic token consumption, `mustChangePassword=false` and a token-free `AuditEvent` commit in one database transaction. Expired, revoked, replayed, disabled-user and already-provisioned tokens return the same safe failure.

`/onboarding/password/` remains only for existing compatibility users who already have a temporary credential. Until onboarding completes, private cabinet routes stay blocked.

`PLATFORM_ADMIN` has TOTP enrollment at `/onboarding/two-factor/`. The policy requires 2FA only for the explicit `APP_ENV=production` identity; test runners use `APP_ENV=test`. There is no feature flag or environment bypass that can disable production 2FA.

Каждая Server Action кабинета проходит `requireCurrentCabinetPrincipal()`: Better Auth session перечитывается без cookie cache, AMS User должен быть активен, password onboarding завершён, а production Platform Admin иметь включённую 2FA. Better Auth 1.7.2 выдаёт credential session только после успешного второго фактора, поэтому свежая session вместе с `twoFactorEnabled` является session-level proof.

Two-factor plugin schema:

- `User.twoFactorEnabled`;
- `TwoFactor.secret`;
- encrypted `backupCodes`;
- verification and account-lockout state.

Better Auth backup codes are the only supported 2FA recovery path. Each code is single-use. Public password reset, public 2FA reset and environment bypass are not configured.

## Provisioning commands

```bash
pnpm user:create -- --username <name> --name <display-name> --system-role PLATFORM_ADMIN --created-by <operator-id>
pnpm user:revoke-setup-token -- --token-id <id>
pnpm user:disable -- --username <name>
pnpm user:set-system-role -- --username <name> --system-role SEO_ANALYST
pnpm user:add-to-organization -- --username <name> --organization <slug> --tenant-role VIEWER
pnpm user:remove-from-organization -- --username <name> --organization <slug>
```

The setup token is emitted once to stdout and is never accepted through argv. `--tenant-role` accepts `ORG_OWNER`, `ORG_MEMBER` or `VIEWER`.

## Current schema contract

- `Member.tenantRole` is the AMS tenant role;
- `User.mustChangePassword` owns first-access gating;
- Better Auth owns `TwoFactor` fields and lifecycle;
- tenant ownership fields and composite constraints are required;
- removal of deprecated plugin-compatible fields is a separate compatibility-first migration listed in `docs/MASTER_PLAN.md`.

## Entry points

- `src/platform/auth/auth.ts` — Better Auth server adapter;
- `src/platform/auth/client.ts` — Better Auth client adapter;
- `src/platform/auth/principal-session.ts` — current session → PrincipalContext;
- `src/platform/authorization/principal.ts` — discriminated types and permissions;
- `src/platform/authorization/principal-factories.ts` — server factories;
- `src/platform/auth/complete-password-onboarding.ts` — audited onboarding command;
- `src/platform/auth/setup-token-plugin.ts` — server-only Better Auth setup endpoint;
- `src/app/setup/*` — one-time password setup surface;
- `src/app/onboarding/*` — first-password and TOTP surfaces;
- `src/modules/identity-access/domain/system-role.ts` — bounded parser для operator CLI roles, без отдельной permission model.

## Proof

- unit: principal kind/permission/type guards;
- integration: migrations, platform/analyst/tenant/no-membership principal factories;
- E2E: login, first-password redirect/completion and private cabinet access at 375/768/1280/1440;
- required before production: real TOTP controlled enrollment/login proof with a provisioned test Platform Admin.
