# SECURITY

> Migration status: this document describes the current `origin/main` security boundary. New work follows Standard 3.0 hard rules from `AGENTS.md`; PrincipalContext, AMS-owned tenancy, 2FA, scopedDb and container production gaps are tracked in `docs/MASTER_PLAN.md`.

## Модель безопасности

Security boundary состоит из public browser surface, Next.js application, Better Auth, server-side authorization, PostgreSQL, worker/provider adapters, AMS Leads API, Nginx и secret store.

## Trust boundaries

### Browser

Может получить:

- публичный landing и legal pages;
- login/lead forms;
- после авторизации — только явно сформированные project/report DTO.

Не получает:

- DB URLs и Prisma records;
- Better Auth secret;
- provider OAuth/API tokens;
- raw provider payloads и internal technical JSON;
- backup credentials;
- delivery bot token/chat ID.

### Next.js application

- Better Auth validates identity/session/2FA challenge only;
- `getCurrentPrincipalState()` re-reads User + AMS Membership and rejects `disabledAt`;
- platform principals do not receive fake tenant scopes;
- compatibility `Session.activeOrganizationId` is accepted only after fresh Membership validation;
- first-password onboarding blocks cabinet routes until `mustChangePassword=false`;
- production Platform Admin requires verified 2FA; `AMS_E2E_TEST` bypass is test-only and forbidden in deployment env;
- private pages/services require permission + resource authorization while routes transition from legacy ActorContext;
- public signup is disabled;
- presentation does not import Prisma;
- readiness exposes no connection details and Nginx restricts it externally.

### PostgreSQL

- runtime source of truth;
- production listener — loopback/local only;
- app и migrator roles разделены;
- every tenant-owned registry, configuration, run, metric and report record has a required `organizationId`;
- direct ownership and composite parent foreign keys reject cross-tenant relations independently of application authorization;
- `pnpm verify:tenant-ownership` is a read-only count-only preflight; production migration stops if any ownership check is nonzero;
- web/worker используют только необходимые runtime privileges;
- migration и restore не выполняются через browser;
- backup/restore обязательны.

### Worker

- отдельный oneshot runtime и OS service;
- web environment не содержит provider tokens;
- worker environment не содержит Better Auth secret;
- provider calls только read-only и только к exact allowlisted HTTPS origins;
- pg-boss uses the same database with a separate schema and bounded pool, but worker runtime starts with `migrate:false/createSchema:false`;
- logs содержат IDs, timestamps, counts, duration, status и safe error code, но не token/header/raw body/PII;
- outbox worker dispatches only registered topics and bounded JSON payloads;
- lease ownership prevents one worker from completing another worker's job;
- safe error codes replace raw exception/response bodies.

### AMS Leads API

Public contact form отправляет имя, телефон, source/UTM и anti-spam metadata в отдельный allowlisted сервис.

- `NEXT_PUBLIC_LEADS_SITE_KEY` — public site identifier, не credential чтения;
- origin/project/site key, honeypot, minimum-fill-time и rate limits проверяются внешним сервисом;
- AMS IMPULSE не сохраняет lead PII в своей PostgreSQL;
- delivery credentials остаются только в AMS Leads API environment;
- frontend не логирует payload; отображаемый Leads API error обязан быть client-safe.

### Nginx

- TLS/HSTS;
- reverse proxy к loopback standalone server;
- static assets;
- framework version suppression и базовые security headers;
- `/api/health/ready` разрешён только localhost;
- не заменяет application authorization.

## Roles и authorization

### PLATFORM_ADMIN

Internal non-tenant principal. Production cabinet access requires verified Better Auth TOTP. Cross-tenant operation must have explicit target tenant and audit; UI visibility is never authorization.

### PLATFORM_ANALYST

Project-specific non-tenant read/sync principal derived from current `SEO_ANALYST`. It cannot manage Platform Admin or tenant memberships.

### Tenant user

Client access derives from fresh AMS Membership role `ORG_OWNER`, `ORG_MEMBER` or `VIEWER`. Knowledge of `clientSlug`, `siteSlug` or report URL does not grant scope.

Authorization flow:

```text
Better Auth session
→ fresh User + Member.tenantRole read
→ PrincipalContext
→ permission
→ module resource authorization
→ explicit DTO + correlation ID
```

Foreign tenant access возвращает denial/not-found без раскрытия существования записи.

## Authentication

- official Better Auth username plugin;
- immutable lowercase username, unique;
- email/password provider используется внутренне;
- public signup и user-created organizations выключены;
- accounts создаются operator-only CLI;
- новый password — ровно 8 цифр согласно действующему provisioning contract;
- password поступает через bounded stdin, не argv;
- auth secret rotation намеренно инвалидирует или сохраняет sessions согласно runbook.

## Секреты и env

Секреты:

- Better Auth secret;
- DB app/migrator passwords и URLs;
- provider tokens;
- offsite backup credentials;
- external delivery credentials.

Source of truth — Doppler/project-specific protected server env. Значения не попадают в Git, docs, fixtures, build output, browser, argv или logs. Server-only values запрещены под `NEXT_PUBLIC_*`.

Допустимые public build values для lead form:

- Leads API URL;
- project identifier;
- public site key.

## Environment validation

- DB принимает только complete URL или complete component set;
- auth secret/URL проверяются вместе;
- non-loopback Better Auth URL требует HTTPS;
- Leads endpoint/project/site key проходят exact public schema;
- invalid production web env блокирует deploy build;
- `RELEASE_SHA` принимает только full lowercase Git SHA.

## PII

- User/session tables могут содержать email, IP и user-agent, доступные только auth/server layer;
- lead name/phone не сохраняются и не логируются AMS IMPULSE;
- test fixtures не используют production PII;
- raw error bodies не сохраняются в `SourceRun`;
- retention/erasure auth data требует отдельной owner-approved operation.
- TOTP secret, backup codes and failed-verification state are auth-only; they never enter DTO, browser logs, audit markers or error response.

## Security headers и indexing

- public landing/legal routes indexable;
- private `/dashboard`, `/analyst`, `/admin`, `/onboarding`, `/c`, `/demo` have noindex metadata;
- readiness external access denied;
- Nginx задаёт HSTS, `nosniff`, `DENY`, referrer policy, permissions policy и `frame-ancestors 'none'`;
- static hashed assets cacheable; private dynamic data не должна попадать в shared public cache.

## Security invariants

- public signup off;
- `PrincipalContext`, not browser organization values or legacy ActorContext, is the target authorization input;
- Better Auth Organization Plugin is removed from runtime; plugin-compatible records are migration-only;
- `mustChangePassword` is server-owned and completion records AuditEvent;
- production Platform Admin requires 2FA; session revocation follows Better Auth password change;
- disabled user denied;
- foreign tenant read/write denied server-side and a mismatched owner-parent relation is rejected by PostgreSQL;
- browser-to-provider calls prohibited;
- Prisma/SQL in UI prohibited;
- web process has no provider tokens;
- provider mutations and paid checker operations prohibited;
- provider origin exact-allowlisted HTTPS;
- secret values absent from code/docs/logs/browser;
- lead PII not stored in AMS IMPULSE DB;
- permissions вычисляются server-side из versioned role matrix;
- report reads требуют отдельный report capability;
- public error envelope содержит stable code, safe message, fieldErrors и correlationId;
- health/auth responses возвращают matching `X-Correlation-ID`;
- idempotency key is tenant-scoped and payload-hash bound;
- audit/outbox/idempotency enqueue is one transaction;
- Platform Admin использует только typed Server Actions и owner commands; resource mutation и safe AuditEvent атомарны;
- provider settings из browser принимают только плоский nonsecret JSON и отклоняют sensitive key names;
- tracked query replacement сохраняет records/history и меняет lifecycle через `enabled`;
- outbox payload, pg-boss transport data, audit markers and JobRun errors exclude secrets/raw PII;
- retries are bounded; permanent failures become visible dead-letter;
- release health SHA поступает из root-owned deploy-generated env;
- concurrent full worker sync blocked by PostgreSQL advisory lock;
- partial/error metadata remains honest;
- production DB not used for local tests;
- local PostgreSQL binds only to `127.0.0.1`; credentials stay in ignored `.env.local`;
- integration runner accepts only explicit `TEST_DATABASE_*` with a `*_test` database name;
- public/auth-boundary E2E does not embed login credentials or production data;
- production migration/deploy/restore requires explicit owner action.

## Проверки security-scope

- platform-admin/analyst/client/disabled-user capability matrix;
- fresh memberships и active organization validation;
- foreign project/site/report denial;
- report capability denial;
- auth unavailable standard 503 envelope;
- correlation/error/health schema tests;
- invalid DB/auth/release/public env rejection;
- public signup disabled;
- exact provider/Leads origin enforcement;
- no secret/raw body in logs and DTO;
- readiness external denial;
- private noindex metadata;
- backup upload confirmation и isolated restore smoke;
- web/worker env separation.

Auth, roles, PII, provider credentials, Nginx, DB, backup и release changes требуют HEAVY review.
