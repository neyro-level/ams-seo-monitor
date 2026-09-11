# ADR-003: Managed PostgreSQL Target

- Status: `IMPLEMENTED`
- Date: `2026-09-11`

## Context

AMS IMPULSE will store several isolated product domains and PII. Keeping PostgreSQL on the application server couples database availability, disk and backup operations to the web runtime.

## Decision

- Provider: Timeweb Managed PostgreSQL 18.
- Database: `ams_impulse`; provider resource identifiers stay outside Git.
- Initial size: one node, 1 CPU, 2 GB RAM, 20 GB storage.
- Region and private network match AMS Main Server: Moscow private BGP network.
- Database has no public IP and accepts application traffic over TLS/private connectivity.
- The current provider configuration uses a self-signed server certificate, so clients require encryption without CA/hostname verification; private BGP routing is the compensating network control.
- Technical identities: web, worker, migrator and backup; runtime roles use `NOBYPASSRLS`.
- Daily provider backups are supplemented by independent logical dump to private S3.
- Cutover downtime budget is up to one hour.
- Old self-managed database remains read-only for 14 days after verified cutover.

## Consequences

- Provisioning and production cutover were explicitly approved and completed on `2026-09-11`.
- Application/server public IP remains unchanged because it serves domains, HTTPS and SSH.
- Migration must prove backup, isolated restore, row counts, tenant isolation and application smoke.
- Failure before accepted cutover returns traffic to the old database; destructive reverse migration is not automatic.
