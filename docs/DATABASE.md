# DATABASE

## Назначение

PostgreSQL — единственный runtime source of truth AMS IMPULSE. Prisma schema определяет tables, relations, indexes и enums; application работает через repository ports.

## Топология

Production contract:

- PostgreSQL `18.x` на том же private server contour;
- listener только `127.0.0.1`/Unix socket;
- public `5432` запрещён;
- remote operator access — только SSH tunnel;
- app, test и migration databases/credentials разделены.

Фактический host/port/database name берётся из protected environment, не из browser или checked-in config.

## Roles

### Runtime app role

Используется Next.js и worker. Имеет только connect/read/write runtime tables/sequences, без superuser и schema migration privileges.

### Migrator role

Используется `prisma migrate deploy` и schema rollout. Web/worker не получают эти credentials.

## Schema policy

- source of truth: `prisma/schema.prisma`;
- applied migration не редактируется;
- schema change требует новой migration;
- production: только `pnpm prisma:deploy`;
- `prisma db push` в production запрещён;
- destructive migration требует backup, compatibility plan и owner approval;
- relational columns используются для identity, access и queryable metrics; JSONB — только для validated complex snapshots/DTO.

Подробная модель: `docs/DATA_MODEL.md`.

## Connection lifecycle

- `src/infrastructure/database/prisma/client.ts` создаёт один shared Prisma/pg context на process;
- worker advisory lock удерживает выделенное pg connection до завершения full sync;
- `/api/health/ready` выполняет реальный DB ping;
- отсутствие DB configuration приводит к явному unavailable/503, а не fallback на filesystem.

## Backup contract

Каждый production backup:

1. создаёт `pg_dump` custom-format;
2. вычисляет checksum;
3. загружает dump/checksum в private offsite S3-compatible storage;
4. подтверждает remote object через HEAD;
5. только после успешного подтверждения применяет retention;
6. пишет safe operational status без credentials.

Retention baseline:

- 7 daily;
- 8 weekly;
- 6 monthly.

Backup на том же VPS без offsite copy не считается достаточным.

## Restore smoke

`pnpm db:restore-smoke`/`ops/postgres/restore-smoke.sh`:

- создаёт временную restore database;
- восстанавливает последний custom-format dump;
- проверяет database identity, Prisma migrations и key row counts;
- требует ненулевые Project, Site и ReportSnapshot counts;
- удаляет временную БД в cleanup;
- никогда не восстанавливает поверх production.

## Data safety

- release rollback не откатывает DB schema/data;
- physical delete project/site/history — отдельная destructive operation;
- test/dev DB names должны явно относиться к безопасному environment;
- production seed выполняется reviewed script после migrations и не должен уничтожать historical records;
- backup/restore credentials хранятся в Doppler/protected server env.

## Операционный статус

Repository содержит schema, migrations, seed, backup и restore tooling. Live database version, backup object, restore result и deployed migration state подтверждаются только server-side operational proof; не выводятся из документа по предположению.
