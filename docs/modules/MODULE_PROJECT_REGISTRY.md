# Module: Project Registry

## Назначение

Управляет checked-in nonsecret иерархией `Проект → Сайты`, build-time routes и readiness. Позволяет добавлять проекты без БД и application admin UI.

Не входит в scope:

- credentials;
- production auth users/passwords;
- runtime onboarding через browser;
- изменение Yandex/Topvisor accounts.

## Роли и права

### SEO_ANALYST / operator

- читает все registry entries;
- запускает `pnpm project:add` локально;
- проверяет generated diff;
- фиксирует изменение через обычный SourceCraft workflow.

### CLIENT_VIEWER

- browser видит только свой server-protected project subtree;
- не изменяет registry.

### COLLECTOR

- читает enabled projects/sites и source mappings;
- не изменяет config.

## Владение данными

Модуль владеет:

```text
config/clients/*.json
config/goals/*.json
config/clusters/*.json
config/tracked-queries/*.json
config/thresholds.json
```

Ключи:

- `clientSlug` — уникальный project identifier;
- `siteSlug` — уникален внутри проекта;
- route `/c/{clientSlug}/{siteSlug}/`;
- source mappings: Webmaster URL, Metrica counter, optional Topvisor project/region;
- goal allowlist и tracked query set.

## Команды

### `pnpm project:add`

Интерактивно или через flags:

- создаёт client config;
- создаёт matching goal profile;
- не перезаписывает существующие файлы;
- поддерживает dry-run/non-interactive mode;
- выполняет registry validation;
- откатывает созданные файлы при validation failure;
- не делает commit/push/deploy.

### `pnpm verify:config`

Проверяет:

- duplicate client/site slugs;
- route collisions;
- HTTPS/placeholder rules;
- source config completeness;
- cluster/goal/tracked-query references;
- Topvisor mapping shape;
- product route inventory.

## Инварианты

- config не содержит secrets;
- enabled source имеет обязательные поля;
- enabled production site не использует `todo.invalid`;
- один `clientSlug` = один project subtree;
- разные sites не объединяются в fake aggregate rank;
- новый config автоматически участвует в static route generation;
- internal naming `clientSlug` сохраняется до отдельной migration.

## Взаимодействия

- `src/modules/client-registry/registry.ts` — runtime/build read model;
- `src/modules/access/navigation.ts` — sidebar hierarchy;
- `collector/orchestration/client-sync.ts` — sync target discovery;
- report compiler получает goal/tracked-query profiles из registry.

## Тесты

Критичные сценарии:

- valid project creation;
- duplicate slug rejected;
- no overwrite;
- dry-run writes nothing;
- validation rollback;
- disabled planned site remains routable and honest;
- project navigation contains only expected sites.

## Audit

В MVP отдельного application audit log нет. История изменений обеспечивается Git/SourceCraft:

- actor — commit author;
- entity — config file;
- before/after — Git diff;
- correlation — commit/PR SHA.

Production operator actions фиксируются release proof, а не registry module.