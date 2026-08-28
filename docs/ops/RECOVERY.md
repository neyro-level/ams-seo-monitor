# RECOVERY

## Статус

Local data recovery and production release rollback are active and verified.

## Recovery principles

- `latest.json` must remain valid after failed publish;
- last-known-good source data must survive partial source failure;
- immutable releases enable static rollback;
- `shared/` snapshots are not deleted during release rollback.

## Current proof

Verified:

- atomic publish keeps previous latest on simulated failure;
- stale lock recovery works;
- endpoint/source partial failure preserves period-specific last-known-good;
- current/previous internal bundles remain separate from browser-safe reports;
- three sites × four presets publish valid reports.

## Production recovery contract

- releases are immutable;
- `current` symlink switches atomically;
- previous release remains until authenticated smoke passes;
- rollback never deletes `shared/`;
- `nginx -t` precedes reload;
- timer/service failures are visible through systemd status/logs;
- stale locks have bounded cleanup;
- token/access incidents use `TOKEN_ROTATION.md`.
