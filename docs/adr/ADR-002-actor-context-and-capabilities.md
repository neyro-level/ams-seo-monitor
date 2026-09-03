# ADR-002: ActorContext и capability-based authorization

## Статус

Принято для Phase 2.

## Контекст

Текущий код передаёт `AuthenticatedUser` и повторяет проверки `systemRole === SEO_ANALYST`. Organization membership запрашивается внутри ProjectService, active organization теряется, а request correlation ID отсутствует. Будущая Admin CMS требует отдельной внутренней роли и permissions по действиям.

## Решение

- заменить `AuthenticatedUser` единым `ActorContext`;
- загрузить fresh user + memberships на каждый private request;
- добавить `PLATFORM_ADMIN` как отдельную system role;
- вычислять immutable permission list server-side по роли;
- использовать capability predicates вместо scattered role equality;
- передавать computed organization scope в repositories;
- генерировать server correlation ID на private request;
- не доверять client role/organization/correlation values;
- сохранить Better Auth как authentication adapter.

## Почему выбрано

- немедленная membership/user revocation;
- одна permission matrix для pages, services и будущего Refine access provider;
- явная tenant scope boundary;
- platform admin не смешивается с analyst;
- correlation ID готовит error/audit/observability layers.

## Альтернативы

### Оставить role checks в pages

Отклонено: права размножаются и расходятся между UI/services.

### Хранить permissions в session cookie

Отклонено: role/membership revocation не действует немедленно, client/session state устаревает.

### Сразу добавить dynamic DB permissions

Отклонено: для текущих трёх ролей это лишняя CMS и migration complexity. Permission matrix versioned in code; DB model появится только при реальной custom-role потребности.

### Включить PostgreSQL RLS сейчас

Отклонено: сначала требуется проверенный ActorContext-to-transaction contract.

## Последствия

- новая enum value требует additive migration;
- все private callsites переходят на ActorContext clean cutover;
- PLATFORM_ADMIN user provisioning остаётся operator-only;
- browser Admin CMS появится только после audit/idempotency foundation;
- future Sentry/log/audit adapters получают correlationId из ActorContext.
