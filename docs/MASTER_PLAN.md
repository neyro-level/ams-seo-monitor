# MASTER PLAN

## Проверенное состояние repository

- Application Platform Core 3.1, profile `multi-tenant / outbox-plus-queue / pii`;
- Next.js standalone web и compiled worker собираются из одного OCI image;
- PostgreSQL/Prisma — единственный runtime source of truth;
- `PrincipalContext`, AMS Membership, 2FA, tenant ownership, scopedDb, composite constraints и optimistic concurrency реализованы для новых и мигрированных путей;
- Project Registry и Platform Admin mutations используют typed actions/commands и atomic AuditEvent;
- OutboxEvent → pg-boss → idempotent handler работает через постоянный worker container;
- SourceCraft имеет дешёвый `pr-check`, exact-head `risky-check`, nightly `daily` и release-only `release-check`;
- production topology и live release state не считаются подтверждёнными без отдельного server/live proof.

## Активный technical debt

### 1. PrincipalContext clean cutover

- перевести оставшиеся report/project/navigation reads с `ActorContext` на `PrincipalContext`;
- удалить ActorContext facade и его tests только после полного affected-callsite proof;
- не расширять compatibility API новыми сценариями.

### 2. Auth schema contract cleanup

- подтвердить отсутствие runtime-зависимости от `Session.activeOrganizationId`, `Member.role` и `Invitation`;
- выполнить removal только новой compatibility-first migration;
- перед contract migration проверить backup/restore и production data shape.

### 3. Production database topology

- repository deploy assets сейчас используют Linux host networking и host-local PostgreSQL operations;
- canonical target — private Timeweb Managed PostgreSQL 18 с TLS и разделёнными runtime/migrator identities;
- переход требует отдельного HEAVY scope: provider capabilities, network/TLS, backup path, connection budget, migration rehearsal, rollback и live proof;
- до такого решения документация не утверждает, что Managed PostgreSQL уже подключён.

### 4. UI token normalization

- проверить private routes на единое использование `crm-*` tokens;
- унифицировать заголовки, таблицы и actions без изменения data/auth/report contracts;
- подтвердить `375 / 768 / 1280 / 1440`.

## Следующие продуктовые этапы

### SZ REDACTED_CLIENT_DATA onboarding

- зарегистрировать organization/project/sites и memberships;
- подтвердить provider mappings и read-only access;
- выполнить первый sync и проверить четыре report periods;
- доказать tenant isolation без публикации credentials.

### Analyst detail views

- добавить диагностические представления поверх существующих snapshots;
- сохранить server-side filtering, bounded pagination и browser-safe DTO;
- не создавать второй report compiler или browser-provider path.

### Topvisor activation

- включать только после подтверждения project/region mapping и API access;
- отсутствие данных не маскировать как нулевые позиции;
- paid rank checks и provider mutations остаются запрещены.

### Availability and freshness monitoring

- внешний monitor только public health/landing;
- alerts по stale integration data и worker/queue degradation;
- readiness body, PII и provider tokens наружу не передавать.

## Порядок выполнения

Каждый независимый этап: отдельная branch/worktree от актуального `origin/main` → scoped proof → PR → review → exact-head FAST/HEAVY gate. Production выполняется только отдельной owner-командой по `docs/RUNBOOK_DEPLOY.md`.

Завершённый пункт удаляется из этого файла. Реализованная история остаётся только в Git/SourceCraft.
