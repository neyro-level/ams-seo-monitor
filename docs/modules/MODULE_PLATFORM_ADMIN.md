# Module: Platform Admin

## Purpose

Protected internal surface `/admin/*` that composes owner-module queries and commands into safe administrative workflows.

## Not In Scope

Business entity ownership, generic CRUD framework, generic dispatcher, Refine, provider credentials and arbitrary Prisma access.

## Ownership

Owns route composition, resource navigation, URL state, shared admin form/table presentation and admin dashboard summary. Business data remains in owner modules.

## Principal

Only fresh `platform-admin` principal is allowed. Anonymous, SEO Analyst and tenant principals are redirected/denied.

## Routes

- `/admin/` redirects to the default resource.
- `/admin/projects/` has specialized project management.
- `/admin/{resource}/` handles bounded resources through allowlisted contracts.

## UI Contract

- TanStack Table + shadcn Table for server-side list state.
- `nuqs` for URL filters/sort/page.
- React Hook Form + Zod for complex forms.
- Mobile tables render as cards.
- Pending state blocks duplicate submission.
- Errors preserve input and expose safe messages.

## Invariants

- Browser state does not own tenant, audit or correlation metadata.
- Client components import only browser-safe contracts.
- Provider settings reject sensitive keys before persistence.
- Every mutable aggregate uses optimistic `version`.
- Destructive action requires explicit confirmation by object name.
- Public landing does not import admin UI.

## Tests

Principal denial, owner command wiring, audit atomicity, stale conflicts, URL state, forms, tables and browser proof at `375 / 768 / 1280 / 1440`.
