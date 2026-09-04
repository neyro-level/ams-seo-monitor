# MASTER PLAN

## Текущий статус

Адаптированная миграция AMS IMPULSE к `AMS Application Platform Core Standard 3.0` завершена в canonical SourceCraft `main`.

Реализованы и прошли последовательный review и risk-specific HEAVY Merge Gate:

- runtime и architecture boundaries;
- `PrincipalContext`, AMS-owned Membership, password onboarding и обязательная 2FA для Platform Admin;
- tenant ownership, `scopedDb`, composite PostgreSQL constraints и optimistic concurrency;
- Project reference slice и typed Platform Admin commands/actions;
- pg-boss outbox, jobs, retention, pino redaction, correlation и readiness;
- immutable OCI image, Docker Compose, migration/maintenance entrypoints и rollback-ready deploy.

История Workstreams 0–8 и их PR остаётся в Git/SourceCraft. Завершённый migration backlog больше не является активным планом и здесь не дублируется.

Фактический stack определяют `package.json`, lockfile, Prisma schema/migrations и runtime config. Текущий production SHA, image digest, backup object и live health являются операционными фактами и проверяются по `docs/RUNBOOK_DEPLOY.md`, а не хардкодятся в этом документе.

## Сохраняемые продуктовые границы

- публичный AMS IMPULSE landing, legal routes и lead/login dialogs;
- URL contract `/c/{clientSlug}/{siteSlug}` и четыре report periods;
- `SiteReportSnapshot` как единственный browser-safe report DTO;
- read-only Yandex Webmaster, Yandex Metrika и optional Topvisor semantics;
- PostgreSQL как runtime source of truth;
- один modular monolith, отдельные web/worker процессы из одного image;
- public signup, billing, CRM pipeline, files, realtime, Redis, RLS и внешний `/api/v1` не добавляются без отдельного product trigger.

## Следующие продуктовые этапы

### 1. SZ REDACTED_CLIENT_DATA onboarding

- зарегистрировать organization/project/sites и operator memberships;
- проверить provider mappings и source availability;
- выполнить первый sync без изменения read-only provider contract;
- подтвердить tenant isolation и директорский отчёт;
- зафиксировать onboarding/recovery evidence без секретов.

### 2. Analyst detail views

- добавить детальные диагностические представления поверх существующих snapshots;
- сохранить server-side filtering, bounded pagination и browser-safe DTO;
- не переносить provider semantics в JSX и не создавать второй report format.

### 3. Explicit Topvisor activation

- включать только после подтверждения owner mapping и доступности API;
- owner fallback до активации остаётся явно подписанным;
- отсутствие данных не маскировать как нулевые позиции.

### 4. External availability and freshness monitoring

- внешний monitor публичного health/landing;
- alerts по stale integration data и worker/queue degradation;
- без передачи PII, provider tokens или readiness body наружу.

### 5. Dashboard token normalization

- отдельный presentation-only stream после стабилизации платформы;
- без изменения data/auth/report contracts.

## Порядок работы

Каждый независимый этап выполняется отдельной branch/PR от актуального `origin/main`. WORK использует один changed-path proof; перед `main` — один review и risk-based gate; production переиспользует gate evidence и добавляет только artifact identity, rollout и live smoke.

Production release, rollback и миграции выполняются только по `docs/RUNBOOK_DEPLOY.md`. Завершённый этап удаляется из активного плана; Git/PR history остаётся журналом реализации.
