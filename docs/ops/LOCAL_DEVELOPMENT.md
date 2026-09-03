# LOCAL DEVELOPMENT

## Контур

Канонический local mode для AMS IMPULSE — Windows-native checkout + Docker Desktop PostgreSQL `18.6`.

- bind: `127.0.0.1`;
- default host port: `55432`;
- databases: `seo_monitor_dev`, `seo_monitor_test`;
- project-scoped named volume: `seo-monitor-postgres-data`;
- production credentials/data запрещены.

## Подготовка

1. Скопировать `.env.example` в ignored `.env.local`.
2. Сгенерировать отдельные local-only `LOCAL_POSTGRES_PASSWORD` и `BETTER_AUTH_SECRET`.
3. Заполнить matching `DATABASE_*` для `seo_monitor_dev` и `TEST_DATABASE_*` для `seo_monitor_test`.
4. Не коммитить `.env.local` и не печатать значения.

## Database lifecycle

```bash
pnpm dev:db:start
pnpm dev:db:status
pnpm dev:db:migrate
pnpm dev:db:seed
pnpm dev:db:stop
```

`dev:db:stop` сохраняет named volume. Удаление volume — destructive operation и не входит в обычный stop/restart.

## Application

```bash
pnpm dev
```

Next.js читает `.env.local`. Local URL: `http://127.0.0.1:3000`.

Auth user создаётся существующим bounded-stdin operator CLI. Local auth bypass и hardcoded password запрещены.

## Tests

Unit tests не требуют DB и не содержат skipped integration suites:

```bash
pnpm test:unit
```

Integration runner:

```bash
pnpm test:integration
```

Runner:

1. читает existing process env или ignored `.env.local`;
2. требует полный `TEST_DATABASE_*` contract;
3. отклоняет database без suffix `_test`;
4. применяет immutable migrations только к test DB;
5. выполняет reviewed seed;
6. запускает пять real-PostgreSQL suites.

Production DB name отклоняется до соединения.

## Browser E2E

Один раз:

```bash
pnpm playwright:install
```

Затем:

```bash
pnpm test:e2e
```

Команда строит production-like standalone runtime и проверяет public UI/auth boundary на 375, 768, 1280 и 1440 px.

## Verification

```bash
pnpm architecture:check
pnpm verify:fast
pnpm verify:heavy
```

`verify:heavy` требует уже запущенную isolated test DB и установленный Playwright Chromium.
