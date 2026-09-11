# AMS IMPULSE

AMS IMPULSE - модульная CRM-платформа АМС. В одном repository развиваются публичный сайт SEO-услуги, приватный кабинет, клиентские продукты, внутренние инструменты, фоновые worker-процессы и production tooling.

Главный вход в проектный канон: [`AGENTS.md`](AGENTS.md).

## Статус

Текущий `main` содержит работающий продукт **SEO Монитор**. Утверждён следующий этап развития:

1. модульное ядро платформы;
2. единая deny-by-default система прав;
3. изолированные продуктовые данные;
4. раздел **Инструменты** и первый модуль **Исследования**;
5. MCP, кабинет и безопасная PWA-оболочка.

Пока соответствующий Pull Request не слит, целевые функции считаются `PLANNED`, а не реализованными.

## Платформа

- Project class: `AMS Application Platform Core 3.4 - Solo Minimal`.
- Profile: `TENANCY = multi-tenant`, `ASYNC = outbox-plus-queue`, `DATA = pii`, `DELIVERY = own-saas`, `PLATFORM_ADMIN = enabled`.
- Database target: Timeweb Managed PostgreSQL 18 в частной сети; текущий production до миграции использует self-managed PostgreSQL 18.
- Primary Git: SourceCraft `origin/main`.
- Production: reviewed `main` -> immutable OCI image -> Docker Compose -> host Nginx -> managed PostgreSQL.
- Runtime source of truth: code, package/lockfile, Prisma schema/migrations и protected runtime environment.

## Продукты

### SEO Монитор

Клиентский продукт для организаций, SEO-проектов, сайтов, provider evidence и директорских отчётов. Это единственный полностью реализованный продукт на старте модульной программы.

### АМС Лиды

Планируемый клиентский продукт для организаций, проектов, воронок и лидов. Его данные и доступы не пересекаются с SEO Монитором.

### Инструменты

Внутренний продукт с единым справочником организаций и проектов. Планируемые модули:

- Исследования;
- Договоры;
- Счета;
- Презентации;
- Клон сайтов.

Первым реализуется модуль **Исследования**.

## Доступ

Better Auth подтверждает личность и сессию. AMS выдаёт отдельные назначения на продукт, организацию и проект. Отсутствующее назначение означает запрет.

```text
User
-> Product membership
-> Explicit project grant
-> Product permission
-> Resource authorization
```

Меню только отражает разрешения. Каждый server route, query, command, worker и MCP tool обязан повторно проверять доступ.

## Активный Канон

- [`docs/PRODUCT.md`](docs/PRODUCT.md) - продукты, пользователи и сценарии.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - boundaries, data paths и runtime topology.
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) - ownership, schema policy и lifecycle.
- [`docs/SECURITY.md`](docs/SECURITY.md) - identity, authorization, tenancy, PII и secrets.
- [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md) - незавершённые эпики.
- [`docs/modules/MODULE_RESEARCH.md`](docs/modules/MODULE_RESEARCH.md) - контракт «Исследований».
- [`docs/RUNBOOK_DEPLOY.md`](docs/RUNBOOK_DEPLOY.md) - production release и recovery.

Архив `docs/archive/` не является источником истины.

## Фактический Стек

| Слой | Версия |
|---|---:|
| Node.js | `24.20.0` |
| pnpm | `11.5.1` |
| Next.js | `16.3.3` |
| React | `19.2.8` |
| TypeScript | `6.0.3` |
| Prisma | `7.10.0` |
| PostgreSQL | `18.x` |
| Better Auth | `1.7.2` |

Точные версии определяют `package.json`, `pnpm-lock.yaml` и `.node-version`.

## Локальная Работа

Канон: [`docs/ops/LOCAL_DEVELOPMENT.md`](docs/ops/LOCAL_DEVELOPMENT.md).

```bash
pnpm install --frozen-lockfile
pnpm dev:status
pnpm dev:start
```

Canonical URL: `http://127.0.0.1:3001`.

## Проверки

```bash
pnpm verify:quick
pnpm verify:risky
pnpm verify:daily
pnpm verify:release
```

Auth, tenancy, schema, RLS, MCP, paid providers and production runtime are `RISKY`. Локальный PASS не заменяет SourceCraft exact-head gate перед merge.

Production начинается только по отдельной команде владельца после merge в `main`.
