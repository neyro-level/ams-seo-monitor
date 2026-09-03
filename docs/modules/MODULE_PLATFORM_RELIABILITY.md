# Module: Platform Reliability

## Назначение

Обеспечивает atomic enqueue, idempotency, audit trail, PostgreSQL outbox, job attempts, leases, retry/backoff и dead-letter visibility для Platform Admin commands и внешних side effects.

## Не входит в scope

- произвольная очередь без зарегистрированного topic handler;
- Redis или отдельный broker;
- HTTP внутри DB transaction;
- хранение secrets/raw PII в payload/error/audit;
- RetentionRun до появления утверждённой retention policy.

## Роли и права

- PLATFORM_ADMIN: typed enqueue/retry через server commands с audit;
- SEO_ANALYST: sync read/run по существующим capabilities;
- CLIENT_VIEWER: outbox/job data не доступна;
- SYSTEM worker: claim/complete/fail только по lease ownership.

Browser endpoints пока отсутствуют. Runtime API доступен только server composition roots.

## Владение данными

### AuditEvent

Safe marker значимого действия: organization, actor, action, entity, before/after marker, source, correlation ID и timestamp.

### IdempotencyKey

Unique `(scope, organizationScope, key)`, request hash, status, response marker, outbox link и expiry. Nullable organization не участвует в uniqueness: `organizationScope="platform"` используется явно.

### OutboxEvent

Topic, JSON payload, status, attempts, availableAt, lease owner/time, safe error, correlation ID и processedAt.

### JobRun

Одна попытка обработки outbox event: unique `(outboxEventId, attempt)`, worker, status, timing и safe error code.

## Команды

### enqueue

В одной PostgreSQL transaction:

1. проверяет idempotency key/hash;
2. создаёт PROCESSING marker;
3. создаёт OutboxEvent;
4. завершает marker с response reference;
5. создаёт AuditEvent;
6. commit.

Повтор с тем же hash возвращает тот же outbox ID. Тот же key с другим hash отклоняется.

### claim

- выбирает ready PENDING или stale PROCESSING event;
- conditional update атомарно получает lease;
- увеличивает attempt;
- создаёт RUNNING JobRun;
- concurrent claimant без ownership получает null.

### complete

Lease owner одной transaction переводит event в PROCESSED и JobRun в SUCCESS.

### fail

Lease owner одной transaction завершает JobRun FAILED и:

- retryable + attempts available → PENDING с exponential backoff;
- permanent/attempts exhausted → DEAD_LETTER.

### health

Возвращает counts `pending`, `processing`, `deadLetter`; readiness показывает их, но dead-letter сам по себе не маскируется под DB outage.

## Topics

Текущий handler:

```text
project.sync.requested
```

Payload: `projectSlug`, optional trigger. Invalid payload и unknown topic являются permanent failure.

## Idempotency и retries

- request payload canonicalized with sorted object keys before SHA-256;
- retry base 30 seconds, exponential, maximum 1 hour;
- default max attempts 5;
- lease default 5 minutes;
- complete/fail требуют matching worker ID;
- no infinite retries.

## Audit

Audit payload содержит только safe markers. Token, password, session cookie, raw provider body и полный PII payload запрещены.

## Runtime

- `PrismaReliabilityRepository` — persistence/transaction owner;
- `ReliabilityService` — validation/hash/time policy;
- `drainOutbox` — registered handlers and bounded batch;
- `seo-monitor-outbox.service/timer` — five-minute oneshot schedule;
- deploy/rollback устанавливает или удаляет units вместе с compatible release.

## Тесты

- atomic audit/idempotency/outbox counts;
- same key/same hash duplicate;
- same key/different hash rejection;
- lease ownership denial;
- retry/backoff;
- second attempt success;
- unknown topic dead-letter;
- JobRun attempt history;
- readiness outbox counts;
- clean migration path.
