# RECOVERY

## Статус

Wave 1 prepares recovery assumptions; production recovery is implemented in Wave 3.

## Recovery principles

- `latest.json` must remain valid after failed publish;
- last-known-good source data must survive partial source failure;
- immutable releases enable static rollback;
- `shared/` snapshots are not deleted during release rollback.

## Current proof from Wave 1

Verified locally:

- atomic publish keeps previous latest on simulated failure;
- stale lock recovery works;
- partial metrica payload keeps previous last-known-good section.

## Future production recovery targets

- rollback to previous `current` symlink;
- validate `nginx -t` before reload;
- detect stale/failed timers;
- bounded lock cleanup;
- operator checklist for token/access incidents.
