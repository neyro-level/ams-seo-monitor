# ARCHITECTURE

## High-level shape

```text
systemd timer
→ compiled Node collector
→ Yandex Webmaster API + Yandex Metrica API
→ validate / normalize / sanitize
→ versioned JSON snapshots
→ Next.js static export out/
→ Nginx HTTPS + Basic Auth
→ analyst/client browser
```

## Почему без backend в MVP

Отчёты приватные, но каждый просмотр не должен поднимать Node runtime и не должен зависеть от базы данных. Поэтому UI собирается как статический export, а обновление данных происходит отдельно по timer.

## Frontend contract

- Next.js App Router;
- `output: "export"`;
- `trailingSlash: true`;
- static routes from checked-in registry;
- build-time generation for `/analyst/`, `/c/{clientSlug}/`, `/c/{clientSlug}/{siteSlug}/`.

## Data contract

Единый data contract — snapshot schema.

Направление зависимостей:

```text
config schemas
→ source adapters
→ normalized source DTO
→ snapshot DTO
→ selectors/calculations
→ dashboard components
```

Второй параллельный report format запрещён.

## Кодовые зоны

```text
src/app/                    static routes
src/modules/access/         navigation and visibility metadata
src/modules/client-registry/registry loading and route params
src/modules/report-data/    fixture snapshot access
src/modules/dashboards/     page selectors/view models
src/components/*            shell and dashboard primitives
src/shared/schemas/*        Zod schemas

collector/storage/          atomic publish, locks, retention helpers
```

## Wave 1 implementation decision

Wave 1 не подключает live APIs. Вместо этого:

- UI рендерится на synthetic fixture snapshots;
- registry real/slotted;
- storage engine тестируется локально на temp directories;
- будущие adapters подключатся в Wave 2 поверх уже зафиксированного contract.
