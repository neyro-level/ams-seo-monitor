# AMS SEO Monitor — Frozen Design System

## Статус

Этот документ — обязательный визуальный контракт AMS SEO Monitor. Интерфейс повторяет утверждённый аналитический кабинет Бастиона. Редизайн, второй набор токенов и отдельная визуальная тема для каждого клиента запрещены.

## Характер

```text
операционный premium
спокойно
точно
плотно, но не тесно
без маркетингового декора
```

Не использовать: glassmorphism, glow, декоративные градиенты кроме малого AMS badge, гигантские заголовки и кнопки, rainbow KPI, dashboard builder, пользовательские темы, горизонтальный scroll всей страницы.

## Typography

Self-hosted PT Root UI, fallback: `"Segoe UI", ui-sans-serif, system-ui, sans-serif`.

| Role | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Page H1 | 24/30 | 20/26 | 600 |
| Section H2 | 22/28 | 18–20/24–26 | 600 |
| Panel H3 | 18/24 | 16/22 | 600 |
| KPI | 30/30–36 | 28/34 | 600 |
| Body | 14/22 | 14/21 | 400 |
| Control | 14/20 | 14/20 | 600 |
| Caption | 12/16 | 12/16 | 500–600 |
| Micro label | 10–11/14 | 10–11/14 | 600–700 |

Числа используют `tabular-nums`. Uppercase — только короткие KPI/system labels.

## Frozen tokens

| Token | Value |
|---|---:|
| `report-page` | `#EEF2F5` |
| `report-surface` | `#FFFFFF` |
| `report-surface-muted` | `#FAFAFA` |
| `report-border` | `#E3E3E1` |
| `report-text` | `#17161A` |
| `report-text-secondary` | `#413F41` |
| `report-text-muted` | `#827F81` |
| `report-sidebar` | `#06253A` |
| `report-sidebar-hover` | `#0A3854` |
| `report-link` | `#0A5277` |
| `report-accent` | `#8A1515` |
| `report-focus` | `#BAE6FD` |

Status colors:

| State | Background | Border | Text |
|---|---:|---:|---:|
| Success | `#ECFDF5` | `#A7F3D0` | `#022C22` |
| Info | `#F0F9FF` | `#BAE6FD` | `#082F49` |
| Warning | `#FFFBEB` | `#FDE68A` | `#451A03` |
| Error | `#FFF1F2` | `#FECDD3` | `#4C0519` |

Цвет никогда не остаётся единственным носителем смысла.

## Shell

Desktop:

- fixed sidebar `260px`;
- content `padding-left: 260px`;
- background `report-page`;
- sidebar не сворачивается.

Mobile/tablet:

- topbar `56px`;
- drawer `min(86vw, 320px)`;
- overlay `slate-950/45`;
- touch target 40px minimum, target 44px;
- focus management и Escape обязательны.

## Spacing and radius

Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40px`.

- analytics KPI/panel/table/tooltip: `8px`;
- shell/nav/control: `12px`;
- brand capsule/high-level filter: `16px`;
- постоянные shadows запрещены; допустимы tooltip, drawer и малый hover lift.

## KPI

- 1 column mobile;
- 2 columns tablet;
- до 4 columns desktop;
- gap `12px`;
- border `1px`;
- radius `8px`;
- padding `16–20px`;
- label `12px` uppercase muted;
- value `30px` semibold tabular-nums.

Не раскрашивать каждый KPI отдельным декоративным цветом.

## Charts

Recharts. Area chart:

- height `280px`;
- horizontal grid `#E3E3E1`;
- axis `#827F81`, 11px;
- no axis/tick lines;
- stroke `#8A1515`, width 2;
- restrained accent area;
- white panel, border, radius 8px, padding 20px.

Bar chart: fill `#17161A`, top radius 6px, max bar 28px.

Каждый chart имеет текстовый summary или table equivalent. Reduced motion учитывается.

## Tables

- white container;
- border `#E3E3E1`;
- radius `8px`;
- только local `overflow-x-auto`;
- head `#FAFAFA`;
- labels 12px uppercase muted;
- cells `10–12px 16px`;
- numeric columns right aligned, `tabular-nums`;
- semantic table markup и `aria-sort` для сортировки.

## Responsive proof

Обязательные viewports: `375`, `768`, `1280`, `1440`.

- `<640`: one KPI column, drawer;
- `640–1023`: two KPI columns, drawer;
- `>=1024`: fixed sidebar, up to four KPI;
- no whole-page horizontal overflow;
- freshness/source status не скрывается;
- длинные client/site/query labels не уменьшают шрифт ниже контракта.

## Change rule

Новые страницы `Summary`, `SEO`, `Traffic` используют только эти tokens и primitives. Новая метрика не является основанием для нового компонента, если существующий KPI/chart/table/status primitive решает задачу.