# AMS IMPULSE Application Design System

Статус: канон приватного интерфейса AMS IMPULSE. Версия проектного профиля: 2.0.

Документ конкретизирует `AMS UI Development Constitution 1.0` и `AMS Application Design System 2.0` для кабинета, Platform Admin, аналитики и отчётов. Архитектурные и security-границы определяет Application Platform Core 3.4.

## Область действия

Система применяется к приватным маршрутам `/dashboard/*`, `/admin/*`, `/analyst/*` и `/c/*`: shell, навигации, таблицам, формам, графикам и рабочим состояниям.

Публичный лендинг, юридические страницы и модальное окно входа используют отдельную тему `theme-public`, Manrope и существующий внешний визуальный язык. Вход остаётся кнопкой на главной, modal `Вход в кабинет` и deep link `/?login=1`; отдельный `/login` не создаётся.

## Иерархия UI

```text
semantic tokens
→ shadcn primitives на Base UI
→ shared application components
→ module presentation
→ route composition
```

- `src/components/ui` — generic shadcn-compatible primitives;
- `src/components/shell`, `dashboard`, `tables`, `charts`, `states` — переиспользуемый application UI;
- `src/modules/*/presentation` — компоненты с бизнес-смыслом;
- `src/app` — композиция маршрутов, без собственного data access.

Новый общий компонент создаётся только при фактическом повторении. UI не импортирует Prisma, repositories и provider adapters.

## Технический UI-стек

- Tailwind CSS 4;
- shadcn-compatible project-owned components поверх Base UI;
- Lucide Icons;
- TanStack Table 9 для рабочих таблиц;
- React Hook Form + Zod для сложных форм;
- nuqs для URL-state;
- Sonner для уведомлений;
- shadcn Chart + Recharts 3 для графиков;
- self-hosted PT Root UI Variable.

Второй UI, table, chart, icon или client-state framework без отдельного решения не добавляется.

## Визуальный профиль

Характер: строгий, спокойный, технологичный, информационно плотный. Рабочая зона светлая; shell графитовый; steel-blue используется дозированно для focus, selection и интерактивных состояний.

Канонические значения:

| Роль | Значение |
|---|---|
| Shell и primary action | `#101720` |
| Shell hover | `#1B2633` |
| Interactive accent и ring | `#5F7FAE` |
| Link | `#3E5D86` |
| Page | `#EEF2F5` |
| Surface | `#FFFFFF` |
| Main text | `#020617` |

Reusable UI обращается только к семантическим переменным:

```text
--background / --foreground
--card / --popover
--primary / --secondary / --accent
--border / --input / --ring
--sidebar-*
--success / --warning / --info / --destructive
--chart-1 ... --chart-5
--radius-control / --radius-panel / --radius-card
--shadow-surface / --shadow-overlay
```

Параллельные aliases по названию продукта или цвета запрещены. Публичные `ch-*` переменные существуют только внутри `.theme-public` и не используются в кабинете.

## Типографика и геометрия

Приватный интерфейс использует PT Root UI Variable. Базовый текст — `14/22`, H1 — `24/30`, H2 — `20/26`, H3 — `16/22`, caption — `12/16`. Числовые показатели используют `tabular-nums`.

- control: радиус `10px`, высота не меньше `40px`, целевая `44px`;
- panel: радиус `14px`;
- card: радиус `18px`;
- spacing scale: `4, 8, 12, 16, 20, 24, 32, 40px`;
- обычные поверхности разделяются фоном и border; постоянные тяжёлые тени запрещены;
- motion: `150–200ms`, modal/drawer до `250ms`, с `prefers-reduced-motion`.

## Application shell

- desktop sidebar: `232px`, collapsed `72px`;
- expanded — состояние по умолчанию;
- collapse хранится локально, без новой state-библиотеки;
- desktop topbar содержит только контекст экрана и глобальные действия;
- mobile использует topbar и drawer;
- пользовательский блок и безопасный выход компактны;
- навигация строится на сервере из `PrincipalContext`; скрытый пункт не заменяет authorization;
- несуществующие маршруты не показываются.

## Таблицы

Рабочая таблица строится на TanStack Table и shadcn Table. Filter, sort, count и page остаются server-side и отражаются в URL. Header sticky, строка `48–52px`, числовые колонки выравниваются вправо. Горизонтальный scroll допускается только внутри table container.

На mobile operational table превращается в карточки. Состояние `данных ещё нет` отличается от `фильтр ничего не нашёл`. Saved views, selection, virtualization и pinned columns добавляются только под реальный сценарий.

## Формы и действия

Сложная форма использует RHF + Zod, одинаковый field contract и обязательную server validation. Label не заменяется placeholder. Ошибка объясняет исправление и сохраняет ввод. Pending блокирует повторную отправку.

Destructive action отделяется визуально и подтверждается именем объекта. После mutation пользователь получает явный success/error feedback. Пароль, provider secret и другие чувствительные значения не возвращаются в browser-safe result.

## Состояния и статусы

Канонические состояния: loading, empty, filtered-empty, error, permission-denied, partial и stale. Loading сохраняет геометрию будущего экрана. Status всегда выражается текстом; цвет и иконка только усиливают значение.

- success — завершённое корректное состояние;
- warning — требуется внимание;
- info — нейтральная системная информация;
- destructive — ошибка или опасное действие;
- partial и stale не маскируются под success.

## Аналитика и графики

Основной рабочий объект важнее декоративного набора KPI. Каждый график отвечает на конкретный вопрос и показывает период, единицы и числовой итог. Цвета, grid, tooltip и legend используют `chart-*` и semantic tokens. Семантика данных остаётся во владельце домена `report-compiler`.

## Responsive и доступность

Минимальная visual QA-матрица: `375 / 768 / 1280 / 1440px`.

- без горизонтального overflow страницы;
- keyboard flow соответствует визуальному порядку;
- focus-visible не скрывается;
- dialog и drawer удерживают focus и корректно закрываются;
- icon-only action имеет accessible name;
- table сохраняет `table/thead/th/scope`;
- touch target не меньше `40px`;
- цвет не является единственным носителем смысла.

## Запрещённый drift

- системный HEX в reusable TSX;
- business-specific CSS в `globals.css`;
- новый параллельный token layer;
- ручной table/form/state pattern при наличии общего компонента;
- декоративные градиенты, glassmorphism и glow в кабинете;
- маркетинговый hero внутри приложения;
- полная загрузка server dataset в browser;
- перенос `ch-*` в private UI;
- визуальный редизайн текущего login modal без отдельного решения владельца.

## Приёмка UI-потока

- component ownership соответствует слоям;
- route/DTO/permission contracts не изменены скрыто;
- semantic tokens используются последовательно;
- expanded, collapsed и mobile shell проверены;
- формы, таблицы, графики и все состояния имеют browser proof;
- keyboard, focus, dialog/drawer и overflow проверены;
- публичный лендинг, legal pages и login modal визуально не изменены.
