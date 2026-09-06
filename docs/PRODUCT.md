# PRODUCT

Product behavior в этом документе authoritative. `PrincipalContext` и AMS Membership являются единственным access contract кабинета.

## Назначение

AMS IMPULSE объединяет две связанные поверхности:

1. публичный сайт услуги SEO-продвижения;
2. приватный кабинет регулярной SEO-отчётности по нескольким проектам и сайтам.

Кабинет заменяет ручную сборку управленческого отчёта повторяемым read-only контуром. Система не изменяет клиентские сайты и не выполняет mutations во внешних SEO-сервисах.

## Пользователи и роли

### Посетитель публичного сайта

- читает предложение AMS IMPULSE и правовые документы;
- открывает форму входа;
- может отправить заявку через отдельный AMS Leads API;
- не получает доступ к данным кабинета.

### PLATFORM_ADMIN

- внутренний оператор АМС, не клиентская роль;
- управляет organizations, memberships, projects, sites и безопасными SEO-настройками в `/admin/*`;
- не получает secret values и не выполняет provider mutations;
- каждая browser mutation проходит fresh server permission, named command, transaction и AuditEvent.

Role/capability и protected Platform Admin реализованы. Public signup и client self-service admin остаются вне scope.

### SEO_ANALYST

- видит все проекты, сайты, готовность конфигурации источников и доступные отчёты;
- открывает `/analyst/` и клиентские отчёты;
- запускает operator-only sync/admin workflows вне browser UI;
- не получает provider credentials через frontend.

### CLIENT_VIEWER

- видит только проекты своей organization membership;
- выбирает сайт и читает единый директорский отчёт;
- не видит соседние tenants, raw provider payloads, internal technical snapshots и credentials;
- не изменяет конфигурацию и данные.

### Worker/operator

- worker читает включённые projects/sites из PostgreSQL;
- использует provider credentials только в server environment;
- собирает read-only evidence, сохраняет историю и компилирует отчёты;
- не обслуживает browser requests.

## Target scale and CMS

- до 50 клиентских организаций;
- несколько projects/sites на organization;
- code-first internal mini CMS для повторяемого onboarding и настроек;
- server pagination/filter/sort для растущих списков;
- jobs/audit/idempotency для безопасных массовых и внешних операций;
- публичный landing сохраняется как готовый project-specific UI.

CMS управляет только разрешёнными полями и командами. Изменение Prisma schema, выполнение произвольного кода, доступ к secret values и generic `updateAnything` через UI запрещены.

## Продуктовая иерархия

```text
Все проекты
→ Проект
  → Сайты
    → Единый отчёт
```

`clientSlug` и `/c/*` сохраняются как действующий URL/data contract.

## Основные сценарии

### Публичный посетитель

1. Открывает `/`.
2. Изучает предложение.
3. Открывает login или lead dialog.
4. Заявка уходит в AMS Leads API; AMS IMPULSE не сохраняет имя и телефон в своей PostgreSQL.

### Аналитик

1. Входит через Better Auth.
2. Открывает `/analyst/`.
3. Проверяет проекты, сайты и готовность конфигурации источников.
4. Открывает report route и выбирает период.
5. Видит source, freshness, baseline и partial labels.

### Клиент

1. Входит через Better Auth.
2. Попадает в `/dashboard/` и только в разрешённый organization subtree.
3. Выбирает проект и сайт.
4. Переключает `week`, `month`, `quarter`, `halfYear`.
5. Читает единый отчёт без доступа к внутренним данным.

### Onboarding проекта

1. Оператор подтверждает URL, timezone и provider access.
2. Через protected Platform Admin создаёт organization, membership, project, site и nonsecret provider mapping.
3. Настраивает goals, tracked query set, thresholds и clusters через typed audited commands.
4. Repeatable bootstrap создаёт только default/reference records; operator configuration импортируется отдельно из private path и не входит в deployment.
5. Production credentials настраиваются отдельным operator step вне browser и Git.

## Директорский отчёт

Один report route показывает:

1. ranking утверждённого ядра;
2. Top-3, Top-10 и динамику tracked queries;
3. техническое состояние и индексацию;
4. показы, клики, CTR и среднюю позицию показов Webmaster;
5. органические визиты, уникальные целевые визиты и конверсию;
6. посадочные страницы, устройства и цели;
7. alerts и opportunities.

Разные сайты не объединяются в искусственный общий ranking KPI.

## Продуктовые инварианты

- `SiteReportSnapshot` — единственный browser-safe report DTO;
- current/previous periods равны по длине;
- `month` — default;
- source, period, freshness и baseline видимы;
- `partial`, `stale` и `null` не маскируются;
- Webmaster average position не считается exact rank;
- Top-3 входит в Top-10;
- ranking denominator — полное утверждённое ядро;
- direct query-to-lead attribution запрещена.

## Реализованный scope

- публичный landing и legal routes;
- Better Auth username/password без public signup;
- server-side analyst/client authorization;
- PostgreSQL/Prisma runtime;
- DB-backed worker и report routes;
- Webmaster и Metrica read-only adapters;
- optional Topvisor read-only history;
- four-period director report;
- immutable standalone release, backup и recovery tooling.

## Non-goals

- CRM, billing или task tracker;
- public client reports;
- self-service signup и клиентский browser admin;
- provider write access, keyword import или paid rank checks;
- raw user-level Metrica Logs API;
- автоматическое изменение клиентских сайтов;
- второй параллельный backend/storage/auth contract.
