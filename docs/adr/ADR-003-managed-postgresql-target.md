# ADR-003: Managed PostgreSQL Target

- Status: `ACCEPTED`
- Date: `2026-09-11`

## Context

AMS IMPULSE will store several isolated product domains and PII. Keeping PostgreSQL on the application server couples database availability, disk and backup operations to the web runtime.

## Decision

- Target provider: Timeweb Managed PostgreSQL 18.
- Target cluster/database: `ams-impulse-prod` / `ams_impulse_prod`.
- Initial size: one node, 1 CPU, 2 GB RAM, 20 GB storage.
- Region and private network must match AMS Main Server after verification through the correct AMS Timeweb account.
- Database has no public IP and requires TLS/private connectivity.
- Technical identities: web, worker, migrator and backup; runtime roles use `NOBYPASSRLS`.
- Daily provider backups are supplemented by independent logical dump to private S3.
- Cutover downtime budget is up to one hour.
- Old self-managed database remains read-only for 14 days after verified cutover.

## Consequences

- Provisioning and production cutover require a separate explicit owner command.
- Application/server public IP remains unchanged because it serves domains, HTTPS and SSH.
- Migration must prove backup, isolated restore, row counts, tenant isolation and application smoke.
- Failure before accepted cutover returns traffic to the old database; destructive reverse migration is not automatic.
