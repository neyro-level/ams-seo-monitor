# MASTER PLAN

Только незавершённая работа. Выполненные этапы и прежние планы не хранятся здесь — их история остаётся в Git/SourceCraft.

## Platform contract completion

### Setup token и auth recovery

- заменить основной временный пароль одноразовым setup-token flow;
- хранить только SHA-256 token hash, expiry/used/revoked и creator metadata;
- использовать Better Auth backup codes для 2FA recovery без public reset и ENV bypass.

### Public-data sanitation

- оставить в repository только synthetic examples/fixtures;
- удалить реальные operator configs/snapshots и запретить известные client markers verifier-ом;
- после закрытия PR переписать целевые Git refs и проверить весь достижимый object graph.

### Security и architecture cleanup

- расширить nested Pino redaction и подтвердить Better Auth rate limits фактических endpoint names;
- разделить Platform Admin forms/actions по bounded resources;
- удалить пустые модули без создания generic framework.

### DateTime и compatibility contracts

- зафиксировать смысл/timezone/UTC proof каждого DateTime в `DATA_MODEL.md`;
- менять на `timestamptz` только доказанные UTC-поля отдельной migration;
- после compatibility Release A доказать нулевое использование legacy auth columns/tables и удалить их новой migration.

## Product backlog

### New tenant onboarding

- зарегистрировать organization/project/sites и memberships;
- подтвердить read-only provider mappings/access;
- выполнить первый sync, четыре report periods и tenant-isolation proof без публикации credentials.

### Analyst detail views

- добавить bounded diagnostic views поверх существующих snapshots;
- сохранить server filtering/pagination и browser-safe DTO;
- не создавать второй report compiler.

### Optional Topvisor activation

- включать только после подтверждения project/region mapping и API access;
- отсутствие данных не маскировать как нулевые позиции;
- paid checks и provider mutations оставить запрещёнными.

### Availability and freshness monitoring

- внешний monitor ограничить public health/landing;
- alert-ить stale integration data и worker/queue degradation;
- readiness body, PII и provider tokens наружу не передавать.

### Private UI normalization

- привести private routes к общим `crm-*` tokens и одинаковым table/action patterns;
- сохранить data/auth/report contracts;
- подтвердить `375 / 768 / 1280 / 1440`.

## Release boundary

До production: final conformance audit → exact-head `release-check` → backup/checksum/offsite proof → isolated restore smoke → reviewed migrations → immutable image exact SHA → live auth/tenant/outbox/heartbeat/sync proof.

Managed PostgreSQL: `NOT_APPLICABLE`. Действующий contract — self-managed PostgreSQL; topology/roles/backups проверяются read-only перед финальным release.
