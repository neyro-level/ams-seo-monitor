# DEPLOY RUNBOOK

## Статус

Production contract подготовлен. Первый deploy выполняется только после HEAVY Merge Gate и появления exact SHA в SourceCraft `main`.

## Production target

- AMS Main Server;
- immutable release directory;
- shared snapshots outside release;
- Nginx serves static `out/`;
- collector runs separately through `systemd` oneshot + timers.

Production URL:

```text
https://seo-monitor.ams24.ru
```

## Release layout

```text
/opt/ams-platform/ams-seo-monitor/
├── releases/<main-sha>/
│   ├── out/
│   ├── dist-collector/
│   ├── config/
│   ├── node_modules/
│   └── release-manifest.json
├── shared/
│   ├── client-reports/
│   ├── snapshots/
│   └── runtime/current -> node-v24-linux-x64
└── current -> releases/<main-sha>
```

Checked-in production units:

- `ops/nginx/ams-seo-monitor.conf`;
- `ops/systemd/ams-seo-monitor.service`;
- `ops/systemd/ams-seo-monitor.timer`.

Daily timer rebuilds all four report presets; a second weekly API run is intentionally absent because it would duplicate the same collection.

## Deploy sequence

1. reviewed exact SourceCraft `main` SHA;
2. build immutable artifact;
3. verify checksums/manifest;
4. extract release;
5. preserve `shared/`;
6. atomic switch `current`;
7. `nginx -t`;
8. reload Nginx;
9. authenticated smoke;
10. enable the daily timer and run one collector smoke.

## Required production inputs

- DNS `seo-monitor.ams24.ru` points to AMS Main Server;
- explicit owner production command;
- exact reviewed SourceCraft `main` SHA;
- project secrets materialized in `/etc/ams-platform/ams-seo-monitor.env`;
- Basic Auth files in `/etc/ams-platform/ams-seo-monitor-auth/`;
- Certbot-issued certificate after the HTTP virtual host passes `nginx -t`.

Secrets, auth files and shared snapshots are never stored inside an immutable release.
