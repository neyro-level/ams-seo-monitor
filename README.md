# AMS SEO Monitor

Централизованный приватный SEO-отчёт АМС для нескольких клиентов и сайтов.

## Что это

AMS SEO Monitor — отдельный самостоятельный продукт АМС. Он собирает read-only данные из Яндекс.Вебмастера и Яндекс.Метрики, сохраняет versioned JSON snapshots и отдаёт клиентам статические приватные отчёты.

MVP принципиально:

- без PostgreSQL, Prisma и SQLite;
- без постоянного Next.js runtime;
- без `next start` в production;
- без application auth;
- с Nginx Basic Auth по защищённым путям;
- с compiled Node collector по timer.

## Стек MVP

- Next.js 16 App Router, `output: "export"`
- React 19
- TypeScript strict
- Tailwind CSS v4
- Recharts
- Zod
- Node.js 24 collector
- versioned JSON snapshots
- Nginx Basic Auth
- systemd oneshot + timers

## Текущее состояние

- Wave 1 foundation зафиксирована в SourceCraft `main`.
- W4 Webmaster и W5 Metrica завершены для Луганска, Алчевска и Мариуполя.
- `pnpm collector:sync:REDACTED_CLIENT_DATA` собирает оба источника и атомарно публикует 12 отчётов: 3 сайта × 4 периода.
- Отчёты содержат равное previous-period сравнение, total Webmaster history, unique target visits и детерминированные кластеры спроса.
- Client routes загружают period-aware protected runtime JSON; `/demo/` остаётся отдельным fixture.
- Следующий блок: scheduled timers и production isolation/deploy.

Предварительный production URL:

```text
https://seo-monitor.ams24.ru
```

## Структура

```text
src/            Next.js static UI
collector/      compiled Node collector and storage engine
config/         nonsecret client/site/goal/cluster config
docs/           core canon
scripts/        local verification scripts
tests/          foundation tests
```

## Команды

```bash
pnpm install
pnpm verify:config
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm collector:webmaster:preflight
pnpm collector:webmaster:audit
pnpm collector:metrica:preflight
pnpm collector:metrica:audit
pnpm collector:sync:REDACTED_CLIENT_DATA
```

## Локальный live-кабинет

Один раз обновить локальные browser-safe reports:

```bash
doppler run --project ams-seo-monitor --config prd -- pnpm collector:sync:REDACTED_CLIENT_DATA
```

Запустить Next dev и loopback-only report server одной командой:

```bash
pnpm dev:live
```

Открыть:

```text
http://127.0.0.1:3000/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/
http://127.0.0.1:3000/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/
http://127.0.0.1:3000/c/REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA/
```

Report server слушает только `127.0.0.1:3001`, читает `.local/shared/client-reports` и не меняет production/static-export contract.

`pnpm build` должен создавать `out/`. `collector:webmaster:*` используют только environment secrets и печатают только safe JSON.

## Source of truth

Сначала читать:

1. `AGENTS.md`
2. `docs/PRODUCT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATA_MODEL.md`
5. `docs/DESIGN_SYSTEM.md`
6. `docs/SITE_REPORT_IA.md`
7. `SECURITY.md`
8. `docs/MASTER_PLAN.md`

## Ограничения

- Секреты не хранятся в Git.
- Browser не ходит в Yandex API напрямую.
- Static routes строятся из checked-in nonsecret registry.
- Snapshot schema — единственный data contract для report DTO.
