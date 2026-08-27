# AMS SEO Monitor — project router

## Язык и формат

- Отвечать по-русски.
- Сначала итог, потом изменения, проверки, риски и следующий шаг.
- Не выдумывать live credentials, host IDs, counter IDs и production URLs.

## Что это за проект

AMS SEO Monitor — отдельный приватный AMS-продукт для SEO-отчётности по нескольким клиентам и нескольким сайтам. Он не является модулем Бастиона и не должен использовать его runtime-код или его базу данных.

## Source of truth

Для любой содержательной задачи читать по порядку:

1. `README.md`
2. `AGENTS.md`
3. `docs/PRODUCT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATA_MODEL.md`
6. `SECURITY.md`
7. `docs/MASTER_PLAN.md`

Если задача только по UI shell, не нужно автоматически читать будущие server/runbook документы. Если задача расширяется в security, deploy или live onboarding — сначала дочитать профильный canon и переклассифицировать риск.

## Инварианты MVP

- Next.js работает в `output: "export"`.
- `next start` не используется как production runtime.
- Нет PostgreSQL, Prisma, SQLite, Better Auth, cookies и sessions.
- Browser не делает запросы к Yandex API.
- Collector работает отдельно от web UI и пишет versioned JSON snapshots.
- Snapshot schema — единый data contract.
- Клиентская изоляция в production обеспечивается Nginx Basic Auth, не фронтендом.
- Секреты, OAuth tokens, htpasswd и чувствительные error bodies не попадают в Git, build output, browser payload и logs.

## Архитектурные границы

- `src/app` — static routes и layouts.
- `src/modules/*` — registry, selectors, dashboards и report DTO.
- `src/components/*` — reusable UI shell blocks.
- `src/shared/schemas/*` — Zod contracts для registry и snapshots.
- `collector/*` — storage/orchestration/source adapters compiled в `dist-collector`.
- `config/*` — только nonsecret checked-in config.

Не вводить параллельный формат данных рядом со snapshot contract.

## Wave 1 scope

Сейчас допустимы:

- core docs;
- static shell;
- fixture data;
- registry/routes;
- storage engine и foundation tests.

Сейчас не делать без отдельной команды:

- production deploy;
- server env writes;
- live OAuth collection;
- htpasswd generation;
- commit/push/PR/merge.

## Проверки

Для Wave 1 обязательны:

```bash
pnpm verify:config
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Для UI-изменений дополнительно нужен browser proof на 375 / 768 / 1280 / 1440.

## Done

Wave 1 считается завершённой, когда:

- core docs объясняют продукт и ограничения;
- build создаёт `out/`;
- routes строятся из registry;
- disabled sites показывают honest `Не подключён`;
- shell соответствует frozen REDACTED_CLIENT_DATA analytics contract;
- invalid snapshot не заменяет latest valid snapshot.
