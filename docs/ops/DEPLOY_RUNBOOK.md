# DEPLOY RUNBOOK

## Статус

Production target зарезервирован, deploy ещё не выполнялся. Activation остаётся отдельной Wave 3/release задачей после Merge Gate.

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

- DNS уже подготовлен владельцем для `seo-monitor.ams24.ru`;
- owner production command;
- SSL/Nginx validation;
- server env materialization;
- Nginx activation;
- systemd activation.

До release запрещены production env writes, htpasswd generation, Nginx/systemd changes и deploy.
