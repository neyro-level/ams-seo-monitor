# SITE REPORT IA

## Route

Один сайт = один единый director report:

```text
/c/{clientSlug}/{siteSlug}/?period=week|month|quarter|halfYear
```

## Product hierarchy

```text
Все проекты
→ Проект
  → Сайты
    → Единый отчёт
```

## Current rules

- tabs нет;
- `month` default;
- data comes from `ReportService` and PostgreSQL-backed `ReportSnapshot`;
- UI still renders `SiteReportSnapshot`;
- source/baseline/freshness labels remain visible;
- ranking stays above technical health and traffic.

## Access

- analyst sees all projects/sites;
- client viewer sees only own organization subtree;
- unauthorized access redirects to `/?login=1`, which opens the login modal;
- foreign tenant access is denied server-side.

## Responsive notes

- no whole-page horizontal overflow target;
- tracked-query table may scroll locally;
- desktop keeps full shell;
- mobile keeps drawer and touch-friendly controls.
