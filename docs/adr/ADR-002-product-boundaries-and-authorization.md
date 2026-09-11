# ADR-002: Product Boundaries And Authorization

- Status: `ACCEPTED`
- Date: `2026-09-11`

## Context

AMS IMPULSE развивается из SEO-кабинета в платформу с клиентскими продуктами и внутренними инструментами. Один пользователь может работать в нескольких продуктах, но доступ к одному продукту или проекту не должен открывать другой.

Текущий `PrincipalContext` выбирает одну первую Membership и поэтому не описывает multi-product и multi-project access.

## Decision

1. Платформа имеет продукты `seo-monitor`, `leads`, `tools`.
2. Каждый продукт владеет своими organization/project records и typed membership tables.
3. Organization membership не даёт project access; каждый project grant явный.
4. Единственный автоматический global bypass имеет `PLATFORM_ADMIN`.
5. `ANALYST` и `CLIENT` получают только explicit product/project grants.
6. Authorization использует deny-by-default RBAC + resource relationship checks.
7. Web, worker и MCP вызывают один application authorization contract.
8. PostgreSQL composite constraints обязательны; RLS с `FORCE ROW LEVEL SECURITY` является дополнительным barrier для tenant-owned runtime tables.
9. Runtime DB roles имеют `NOBYPASSRLS` и не владеют защищёнными таблицами.

## Consequences

- Navigation строится только из effective access, но не является security boundary.
- Недоступный ресурс возвращается как not-found без подтверждения его существования.
- Product grants нельзя хранить generic polymorphic ссылками без foreign keys.
- Access changes audited and revoke active sessions.
- Все tenant reads должны выполняться через scoped transaction context.
- Backup role и restore procedure обязаны учитывать RLS отдельно от runtime access.
