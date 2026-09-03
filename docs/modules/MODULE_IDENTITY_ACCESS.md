# Module: Identity and Access

## Назначение

Создаёт единый server-side ActorContext и capability boundary для пользователей, организаций, проектов, отчётов и будущей Admin CMS.

## Не входит в scope

- public signup;
- self-service password reset/invitations;
- Admin CMS forms;
- AuditEvent persistence — следующий data phase;
- PostgreSQL RLS;
- client-side authorization как security boundary.

## Роли и права

### PLATFORM_ADMIN

Внутренний оператор АМС. Global project/report/sync read, будущие organization/project/settings/membership commands. Cross-tenant actions требуют AuditEvent после появления audit foundation.

### SEO_ANALYST

Global read проектов/отчётов/sync status. Не управляет users, memberships или platform settings.

### CLIENT_VIEWER

Только organization-scoped project/report read по активным memberships.

Capabilities являются server contract. UI использует их только для presentation.

## Владение данными

- Better Auth: User, Session, Account, Verification, Organization, Member, Invitation;
- application contract: ActorContext, Permission, MembershipScope;
- adapter: Better Auth session + Prisma identity lookup.

## ActorContext

```text
userId
email
name
systemRole
activeOrganizationId
memberships[]: membershipId, organizationId, role
permissions[]
correlationId
```

Контекст создаётся только на сервере. Client `organizationId`, role, permission и correlation ID не являются доказательством доступа.

## Permissions

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

`PLATFORM_ADMIN` получает полный platform set. `SEO_ANALYST` получает global read + sync read/run. `CLIENT_VIEWER` получает organization-scoped project/report read.

## Команды

Текущий operator CLI:

- create user;
- disable user;
- set system role;
- add/remove membership.

Phase 2 добавляет `PLATFORM_ADMIN` в role parser. Browser mutations остаются запрещены до AuditEvent/command foundation.

## Запросы

- create current ActorContext from session;
- resolve actor by user ID for integration/operator tests;
- list/get authorized projects/sites;
- get authorized report;
- capability predicate.

## Инварианты

- disabled user не получает ActorContext;
- PLATFORM_ADMIN/SEO_ANALYST global access различается permissions, а не scattered role checks;
- CLIENT_VIEWER scope = current memberships from DB;
- membership revocation действует на следующий request;
- every private request получает correlation ID;
- project/report repository query всегда получает computed server scope;
- public signup remains disabled;
- secrets/password/session token не входят в ActorContext.

## Взаимодействия

- Project Registry принимает ActorContext и строит tenant scope;
- Reporting повторно проверяет project/site access;
- App routes используют capability predicates;
- structured errors/logs получают correlationId;
- future Admin CMS использует те же capabilities.

## Idempotency и retries

Read context может безопасно повторяться. User/membership mutations не получают retry semantics до Phase 3 idempotency/audit foundation.

## Audit

До Phase 3 operator mutations фиксируются Git/server operator evidence. После AuditEvent role/membership/platform-admin actions обязаны писать audit в одной transaction.

## Тесты

- role → permission matrix;
- disabled user denied;
- membership list and active organization;
- analyst/admin global reads;
- client cross-tenant denial;
- correlation ID exists and is stable inside one ActorContext;
- CLI accepts PLATFORM_ADMIN and rejects unknown role;
- E2E unauthenticated/private boundary.
