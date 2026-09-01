# MASTER PLAN

## Назначение

Этот файл хранит только текущий verified state, ближайшие задачи и ограничения. История реализации остаётся в Git/SourceCraft; завершённые пошаговые планы здесь не дублируются.

## Текущий verified state

### Product

- Domain infrastructure is active at `https://impulse.ams24.ru`; the current canonical production runtime remains live until the reviewed AMS IMPULSE release.
- Product hierarchy: `Все проекты → Проект → Сайты → Единый отчёт`.
- `/analyst/` показывает project readiness.
- `/c/{clientSlug}/` показывает сайты проекта.
- `/c/{clientSlug}/{siteSlug}/` показывает единый director report.
- `/demo/` остаётся изолированным fixture.
- Runtime работает как Next.js server + PostgreSQL + Better Auth.

### Data pipeline

- Webmaster и Metrica read-only adapters работают для Луганска, Алчевска и Мариуполя.
- Один REDACTED_CLIENT_DATA sync публикует 3 сайта × 4 periods.
- Periods: 7, 28, 90 и 180 дней; month — default.
- Current/previous periods равны и выровнены по последней фактической дате Webmaster.
- Snapshot и browser-safe report проходят validation и atomic publish.
- Partial source failure сохраняет period-specific LKG.
- Internal source bundles не публикуются в browser paths.

### Analytics and UI

- tracked ranking расположен первым в отчёте;
- Top-3/Top-10 считаются от полного утверждённого ядра;
- Webmaster totals отделены от popular-query detail;
- Metrica unique target visits не смешиваются с cumulative goal actions;
- source, period, freshness и owner baseline labels видимы;
- responsive shell проверялся на 375, 768, 1280 и 1440 px.

### Production operations

- immutable exact-main releases;
- source artifact собирается из reviewed main и достраивается на Linux target до cutover;
- Nginx TLS и reverse proxy к Next.js runtime;
- Better Auth и organization membership обеспечивают application access boundary;
- worker oneshot, daily trigger, PostgreSQL advisory full-sync lock и structured journald events;
- local daily/weekly/monthly backup и restore row-count smoke;
- private Timeweb offsite bucket активен: upload + object HEAD confirmation проходят до retention prune;
- public landing is indexable; private dashboard routes remain noindex/noarchive and server-authorized;
- previous release сохраняется для rollback.

Exact deployed SHA и operational proof читаются только из production release manifest/shared state, не из этого документа.

## Active backlog

### 1. SZ REDACTED_CLIENT_DATA onboarding

Цель: подключить первый сайт проекта без изменения текущей Next.js + PostgreSQL + Better Auth архитектуры.

Требуются подтверждённые:

- production site URL;
- Webmaster host access;
- Metrica counter and goals;
- timezone;
- client access delivery method.

Acceptance:

- config valid;
- source preflight успешен;
- четыре periods публикуются;
- client isolation matrix проходит;
- release остаётся отдельной owner-командой.

### 2. Analyst detail views

Цель: дать аналитику доступ к сохранённым normalized source bundles без расширения client payload.

Acceptance:

- отдельная analyst-only route/access boundary;
- internal bundle schema validation;
- no raw responses, credentials или user-level data;
- client routes не получают detail DTO.

### 3. Explicit Topvisor activation

Выполняется только после credentials и явного owner decision.

Acceptance:

- только read-only history endpoints;
- disabled mapping остаётся default до решения;
- exact capture заменяет fallback без потери source/baseline labels;
- checker/import/mutations отсутствуют.

### 4. External availability monitoring

Цель: обнаруживать недоступность private service и stale reports без публикации credentials.

Acceptance:

- безопасный authenticated probe;
- freshness threshold;
- alert без response body и secret leakage;
- документированный recovery path.

### 5. Token rotation drill

Проверить операционный сценарий `docs/ops/TOKEN_ROTATION.md` без раскрытия token values и без изменения application contract.

## Не делать без отдельного решения

- database или application auth migration;
- public report links;
- provider mutations или paid rank checks;
- destructive snapshot retention;
- production deploy;
- Nginx/systemd activation;
- merge в `main`.

## Следующий рекомендуемый этап

SZ REDACTED_CLIENT_DATA onboarding: он проверяет повторяемость продукта на втором проекте и не требует новой архитектуры. Если production inputs ещё не подтверждены, следующий безопасный product scope — analyst detail views.
