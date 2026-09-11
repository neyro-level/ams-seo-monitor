# Module: Research

- Статус кода: `IMPLEMENTED_IN_STACKED_PRS`
- Production: `NOT_RELEASED`
- Продукт: **Инструменты**
- Маршрут: `/tools/research/`
- Очередь: `research.run.v1`

## Назначение

«Исследования» хранит поисковые исследования по общему `ToolsProject`, выполняет подтверждённые платные запросы XMLRiver, строит карту конкурентов и создаёт приватный CSV. Кабинет и MCP используют один application service и один `AuthorizationService`.

## Владение Данными

```text
ToolsOrganization -> ToolsProject -> Research -> Query -> Run
Run -> QueryRun -> Evidence / CompetitorProjection / Export
```

Research не создаёт собственные организации и проекты. Все связи содержат `organizationId/projectId` и защищены составными внешними ключами и RLS.

## Реализованный MVP

- create/list/update/archive исследования;
- 1-20 запросов;
- локальная оценка стоимости и отдельное подтверждение;
- дневной лимит 500 ₽ и месячный 3000 ₽;
- pg-boss queue и worker concurrency `1`;
- XMLRiver: Yandex organic, ads, related/suggestions и Wordstat;
- bounded XML parser без DTD/external entities;
- finite retry только для явно retryable отказа;
- ambiguous timeout не повторяет платный вызов;
- история запусков, Evidence и CompetitorProjection;
- private S3 CSV и signed URL на 60 секунд;
- кабинет и шесть MCP tools.

Не реализованы: partial run, cancellation UI, XLSX, AI insights, отдельные research templates и уведомления Research.

## Состояния

- Research: `DRAFT | READY | RUNNING | SUCCEEDED | FAILED | ARCHIVED`.
- Run: `DRAFT | AWAITING_CONFIRMATION | QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELLED`.
- QueryRun: `PENDING | RUNNING | SUCCEEDED | FAILED`.

При неоднозначном результате provider call запуск завершается `FAILED` с безопасным кодом; автоматического повтора нет. Зависший `RUNNING` старше 20 минут восстанавливается только внутри scope текущего job.

## Права

- `VIEWER`: чтение проекта и export завершённого результата.
- `OPERATOR`: чтение, создание, изменение, estimate, run, export.
- `ANALYST`: те же действия внутри явно назначенного проекта.
- `PLATFORM_ADMIN`: global access.
- без Tools grant: deny.

Server Component, server action, MCP и export повторно проверяют полный `organizationId/projectId/researchId`. Чужой ресурс возвращает not-found semantics.

## MCP

Endpoint `/mcp`, Streamable HTTP, OAuth 2.1 + PKCE, scope `mcp:research`:

- `research_create_draft`;
- `research_estimate_run`;
- `research_confirm_and_run`;
- `research_get_run`;
- `research_create_export`;
- `research_get_export_download`.

MCP не предоставляет SQL, provider credentials или admin bearer token. Каждый вызов использует свежие AMS grants.

## Кабинет

- `/tools/research/` - разрешённые организация/проект, список и inline-создание.
- `/tools/research/[researchId]/` - редактирование, estimate/confirm, история, archive и CSV.

Селекторы строятся сервером только из выданных Tools projects. Подмена query string или hidden fields повторно блокируется на сервере.

## Хранилище И Секреты

Нормализованные данные находятся в PostgreSQL. CSV хранится в private S3 с SSE AES-256 и `no-store`; signed URL живёт 60 секунд. `XMLRIVER_USER`, `XMLRIVER_KEY`, AWS credentials и signed URL не логируются.

## Acceptance До Production

- PostgreSQL migrations и RLS integration suite проходят на test DB;
- один проект не читает соседний проект;
- missing user/job context получает deny;
- OAuth/MCP smoke проходит из Codex;
- worker restart не повторяет ambiguous paid call;
- CSV доступен только после свежей авторизации.
