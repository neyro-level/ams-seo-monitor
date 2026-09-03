# AUTH

> Legacy runtime contract: Better Auth Organization Plugin and `ActorContext` remain factual `origin/main` behavior only until Workstream 2. New auth/tenant code must target AMS-owned Membership and discriminated PrincipalContext from `MASTER_PLAN.md`.

## Модель

Better Auth `1.7.2` с Prisma adapter, username plugin и organization plugin — authentication boundary. Application authorization использует server-generated `ActorContext` и versioned capabilities.

- public signup выключен;
- accounts создаёт только operator CLI;
- private routes читают fresh User + memberships на каждый request;
- disabled user не получает ActorContext;
- Nginx и client navigation не заменяют authorization.

## System roles

### PLATFORM_ADMIN

Внутренний operator АМС. Получает platform/project/report/sync/settings capabilities. Будущие browser mutations остаются запрещены до AuditEvent/command foundation.

### SEO_ANALYST

Global project/report read и sync read/run. Не управляет memberships или platform settings.

### CLIENT_VIEWER

Только organization-scoped project/report read по текущим memberships.

`PLATFORM_ADMIN` добавлен additive migration `20260903090000_add_platform_admin_role`. Existing users не меняются автоматически.

## ActorContext

```text
userId
email
name
systemRole
activeOrganizationId
memberships[]
permissions[]
correlationId
```

Source: `src/modules/identity-access/domain/actor-context.ts`.

Контекст создаётся только на сервере:

```text
request headers
→ Better Auth session
→ fresh User + Member records
→ disabledAt check
→ validate activeOrganizationId against memberships
→ role capability map
→ server correlation ID
→ ActorContext
```

Client role, organization ID, permissions и correlation ID не считаются доказательством доступа.

## Capabilities

```text
platform:manage
membership:manage:any
project:read:any
project:read:organization
project:manage:any
report:read:any
report:read:organization
sync:read:any
sync:run:any
settings:manage:any
```

ProjectService строит repository scope из capabilities + ActorContext memberships. ReportService отдельно требует report-read capability. Platform admin и analyst global access больше не зависит от scattered `systemRole === ...` checks.

## Sign-in

- immutable lowercase username;
- username: `a-z`, digits, `_`, length 3–30;
- public signup disabled;
- operator password contract: ровно 8 цифр;
- password передаётся bounded stdin, не argv;
- login modal расположен на `/`; `?login=1` открывает его после redirect.

## Admin commands

```bash
<secret-provider> | pnpm user:create -- --username <name> --name <display-name> --system-role PLATFORM_ADMIN
pnpm user:disable -- --username <name>
pnpm user:set-system-role -- --username <name> --system-role SEO_ANALYST
pnpm user:add-to-organization -- --username <name> --organization <slug>
pnpm user:remove-from-organization -- --username <name> --organization <slug>
```

`parseSystemRole` принимает только versioned roles. Role/membership browser mutations появятся только после Phase 3 audit/idempotency foundation.

## Environment

`src/platform/config/server-environment.ts` валидирует:

- complete DB URL или complete DB component set;
- DB port/protocol;
- Better Auth secret minimum length;
- complete Better Auth pair;
- HTTPS auth URL outside loopback.

`/api/health/ready` требует DB reachability и configured auth.

## Errors и correlation

- каждый auth request получает `X-Correlation-ID`;
- auth unavailable использует standard public error envelope;
- stack, SQL, session token и secret не возвращаются;
- ActorContext correlation ID предназначен для будущих logs/audit/Sentry.

## Entry points

- `src/modules/identity-access/index.ts` — ActorContext и capability contract;
- `src/modules/identity-access/server.ts` — auth/session/authorization adapters;
- `src/modules/identity-access/client.ts` — login presentation;
- `src/app/api/auth/[...all]/route.ts`;
- `scripts/auth-admin.ts`.

## Проверки

- role → capability matrix;
- platform admin/analyst global reads;
- client membership scope;
- active organization validation;
- disabled user denial;
- foreign project/site/report denial;
- report capability denial;
- correlation ID contract;
- invalid role/env/error envelope rejection;
- unauthenticated E2E redirect/login dialog.
