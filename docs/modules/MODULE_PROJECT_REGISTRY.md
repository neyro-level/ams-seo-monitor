# Module: Project Registry

## Purpose

Owns tenant business structure: Organization → Project → Site, provider mappings, goals, query core, threshold/cluster profiles and configuration readiness.

## Not In Scope

Provider HTTP calls, credential storage, report compilation, physical deletion of business history and generic CRUD.

## Ownership

Models: Organization, Project, Site, ProviderConnection, SearchTarget, ProviderOperation, GoalDefinition, GoalDefinitionSite, TrackedQuerySet, TrackedQuery, ThresholdProfile, QueryClusterProfile, QueryClusterGroup.

## Principals

- Platform Admin: global read/write with explicit target organization.
- SEO Analyst: global read.
- Tenant roles: organization-scoped read; management only when explicitly allowed by command.
- Job: only through worker APIs.

## Commands And Queries

Commands are typed and versioned: create/update/status operations for projects, sites, provider mappings, goals, query sets and profiles. Mutations use `defineCommand`, transaction-bound repositories and optimistic `version`.

Queries expose bounded list/detail/navigation/readiness DTOs with allowlisted filters, sorts and pagination.

## Invariants

- Project belongs to one Organization.
- Site belongs to the same Organization as Project.
- Enabled site has exact HTTPS URL, timezone and approved provider mappings.
- Provider settings store only nonsecret IDs/settings.
- `clientSlug/siteSlug` remains stable route contract.
- Replacing query core disables missing queries instead of deleting history.
- Resource authorization happens inside the transaction for writes.

## Async

Only named commands enqueue events. Current project sync topic: `project.sync.requested`; integration setup and competitors sync are worker-owned follow-up topics.

## Tests

Tenant ownership, stale version conflicts, audit atomicity, provider setting redaction, query preservation, URL state and responsive admin UI.
