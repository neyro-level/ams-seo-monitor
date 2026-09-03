# ADR-001: Применить AMS Application Platform Core Standard

## Статус

Superseded as target architecture by the owner decision to adopt Core Standard 3.0. Preserved as implementation history for the v1 migration.

## Контекст

AMS IMPULSE уже использует Next.js standalone, TypeScript, Prisma/PostgreSQL, Better Auth, Tailwind, Zod, отдельный worker и exact-main release. Следующая цель — обслуживать до 50 клиентских организаций и дать внутреннему оператору надёжную code-first mini CMS без разрушения SEO/reporting semantics и готового публичного UI.

Универсальный `AMS Application Platform Core Standard` v1.0 задаёт более полный baseline: modular monolith, ActorContext, module APIs, Refine/shadcn/RHF для CRUD, audit/outbox/jobs, Dependency Cruiser, Playwright, Sentry и repeatable local PostgreSQL.

Буквальное добавление всех референсных сущностей нарушило бы сам стандарт: CRM Contact/Pipeline, Redis, RLS, object storage и отдельный backend не имеют текущего project contract.

## Решение

1. Принять все обязательные cross-cutting требования стандарта, применимые к AMS IMPULSE.
2. Внедрять их отдельными законченными фазами и HEAVY PR, а не одним переписыванием.
3. Сохранить один Next.js modular monolith, одну PostgreSQL и отдельный worker process.
4. Мигрировать текущие global layers в vertical business modules по одному домену с public `index.ts`.
5. Добавить Refine Core, shadcn/ui и React Hook Form только вместе с первым рабочим Admin CMS resource.
6. Ввести AuditEvent до первой пользовательской CMS mutation; OutboxEvent/JobRun — до первого deferred external side effect.
7. Рассматривать RLS только после стабильного ActorContext/transaction contract и real-PostgreSQL isolation tests.
8. Сохранить public AMS IMPULSE UI без визуального redesign; Refine изолировать внутри private admin area.
9. Не создавать template repository в текущем scope. Извлекать reusable platform только после стабилизации повторяемых модулей.

## Почему выбрано

- уменьшает blast radius;
- сохраняет работающий production и report contract;
- не добавляет пустые dependencies/abstractions;
- позволяет проверять migrations, tenancy и UI по фазам;
- создаёт реальную платформу из работающих модулей, а не speculative framework.

## Альтернативы

### Переписать проект сразу под canonical folder tree

Отклонено: высокий regression risk для auth, worker, release и public UI; трудно проверить один огромный diff.

### Добавить Refine и generic CRUD до command/data contracts

Отклонено: создаёт arbitrary model updates и связывает UI с Prisma shape.

### Сразу выделить template repository

Отклонено: преждевременная абстракция до повторного использования.

### Добавить Redis, RLS, NestJS и object storage как «полный стек»

Отклонено: стандарт сам требует доказанной необходимости и отдельного contract.

## Последствия

- platformization займёт несколько последовательных PR;
- временно сохраняется текущая layered структура рядом с новыми public boundaries;
- каждый перенесённый домен удаляет старый путь clean cutover;
- schema/auth/jobs phases требуют HEAVY Gate и isolated PostgreSQL;
- внешний UI остаётся стабильным и получает regression coverage;
- `docs/PLATFORM_CONFORMANCE.md` становится проектной картой соответствия, но не вторым architecture source of truth.
