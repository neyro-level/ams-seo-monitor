# DEPLOY RUNBOOK

## Статус

Wave 1: deploy не выполняется. Этот документ фиксирует будущий production contract, чтобы не изобретать его заново в Wave 3.

## Production target

- AMS Main Server;
- immutable release directory;
- shared snapshots outside release;
- Nginx serves static `out/`;
- collector runs separately through `systemd` oneshot + timers.

## Planned release layout

```text
/opt/ams-platform/ams-seo-monitor/
├── releases/
├── shared/
└── current -> releases/<release-id>
```

## Planned deploy sequence

1. reviewed exact SourceCraft `main` SHA;
2. build immutable artifact;
3. verify checksums/manifest;
4. extract release;
5. preserve `shared/`;
6. atomic switch `current`;
7. `nginx -t`;
8. reload Nginx;
9. authenticated smoke;
10. timer/source preflight.

## Human gates

Required later:

- owner deploy command;
- server env materialization;
- Nginx activation;
- systemd activation;
- DNS/SSL only when needed.

## Not in Wave 1

- no production deploy;
- no rollback execution;
- no env writes;
- no htpasswd generation.
