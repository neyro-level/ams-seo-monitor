# ADR-003: Adopt AMS Application Platform Core Standard 3.0

## Статус

Принято владельцем и реализовано в canonical `main` через Workstreams 0–8 и последовательные PR. Production cutover по-прежнему требует отдельного release intent и operational proof.

## Контекст

AMS IMPULSE уже имеет Next.js/Prisma/PostgreSQL/Better Auth runtime, vertical modules, client isolation, audit/outbox foundation, Platform Admin surface, tests и exact-SHA standalone deploy.

Core Standard 3.0 меняет обязательные contracts:

- discriminated PrincipalContext вместо aggregate ActorContext;
- AMS-owned Membership/RBAC вместо Better Auth Organization Plugin;
- scopedDb + explicit organization ownership + composite tenant constraints;
- defineCommand/defineAction как единственный mutation path;
- pg-boss между transactional outbox и job handlers;
- pino JSON;
- TanStack Table + nuqs;
- immutable OCI image + Docker Compose + private Managed PostgreSQL;
- first-password lifecycle и 2FA для Platform Admin.

На момент принятия решения код этим contracts полностью не соответствовал. Поэтому миграция выполнялась совместимыми workstreams; destructive очистка legacy schema не входила в общий release train.

## Решение

1. Принять Standard 3.0 как target architecture и оставить current `origin/main` production baseline до завершения rewrite stack.
2. Сохранить продуктовые SEO/reporting semantics, public AMS IMPULSE UI, `/c/*` URLs и `SiteReportSnapshot`.
3. Использовать project-specific principal `platform-analyst` для текущего SEO_ANALYST. Он не является Platform Admin и не получает fake tenant.
4. Перенести client authorization в tenant-user PrincipalContext с AMS Membership role `ORG_OWNER | ORG_MEMBER | VIEWER`.
5. Удалить Better Auth Organization Plugin из runtime; legacy plugin tables/columns оставить на compatibility period.
6. Сохранить existing CUID как approved opaque identifier. Массовый re-key не выполнять.
7. Удалить Refine вместо ADR-исключения: текущая resource registry не оправдывает отдельный framework.
8. Применить defineCommand/defineAction сначала к Project reference slice, затем к остальным mutations.
9. Добавить tenant columns/constraints только expand/backfill/validate/cutover migrations. Contract/drop — отдельный поздний release.
10. Принять pg-boss как queue subsystem с отдельными pool, schema lifecycle и migration step.
11. Перейти на immutable Docker image/Compose production topology только после provider/network/rollback proof.
12. Готовить workstreams stacked branches/PRs без merge; выводить stack в main только отдельной командой владельца.

## Не относится к решению

Не добавляются CRM contacts, pipeline, kanban, billing, public signup, files, realtime, Redis, RLS, search engine, external API или template repository.

## Последствия

Положительные:

- Platform Admin и tenant users больше не делят неоднозначный context;
- tenant isolation защищается application, repository и database слоями;
- business mutations получают один проверяемый path;
- background delivery и production становятся воспроизводимыми;
- AI получает меньше легальных способов нарушить boundary.

Цена:

- auth и tenant schema требуют additive migration/backfill;
- production topology меняется отдельным инфраструктурным workstream;
- legacy fields/tables временно остаются;
- merge train длинный и должен проходить последовательно;
- новый production release блокируется до 2FA, scopedDb, pg-boss и Docker proof.

## Альтернативы

### Сохранить Standard v1 implementation

Отклонено: Better Auth tenancy, ActorContext, generic Admin dispatcher, direct outbox handler и host build противоречат новым hard rules.

### Переписать продукт с нуля

Отклонено: текущие provider/report contracts, production data и public UI уже ценны. Compatibility-first migration безопаснее и дешевле.

### Выполнить destructive one-shot schema rewrite

Отклонено: нарушает expand/migrate/contract, усложняет rollback и создаёт риск потери tenant/report history.

### Оставить Refine через ADR

Отклонено: текущая интеграция использует его только как resource registry; TanStack/nuqs/shadcn patterns покрывают реальную задачу без лишнего framework.

## Связанные источники

- `docs/MASTER_PLAN.md`;
- `docs/archive/2026-09-03/PLATFORM_CONFORMANCE.md` — исторический gap register до реализации;
- `AGENTS.md`;
- historical ADR-001 и ADR-002.
