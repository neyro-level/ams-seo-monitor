# MASTER PLAN

Документ содержит только незавершённую работу. Реализованные изменения сохраняются в Git и открытых SourceCraft PR.

## Ближайший Gate

1. Провести review stacked PR #107-#117 в порядке зависимостей.
2. Для auth/data/RLS/MCP выполнить `RISKY` Merge Gate на точном SHA каждого изменившегося PR.
3. До merge выполнить PostgreSQL integration и tenant-isolation suite на отдельной test DB.
4. Последовательно слить PR в `main`, обновляя следующий base после каждого merge.
5. Production не выпускать без отдельной команды владельца.

## До Production Research

- настроить project Doppler variables для XMLRiver, Research pricing, OAuth origin и private S3;
- создать/проверить роли `ams_web`, `ams_worker`, `ams_migrator`, `ams_backup`;
- применить миграции на изолированной копии БД;
- доказать RLS matrix для web и project-scoped research worker;
- выполнить OAuth/MCP smoke из Codex на каждом из трёх локальных компьютеров;
- проверить кабинет на `375`, `768`, `1280`, `1440` с реальной test DB;
- проверить установку PWA на Windows, Android и iOS home screen;
- подтвердить backup/restore и короткоживущую S3-ссылку CSV.

## Managed PostgreSQL

Переезд на Timeweb Managed PostgreSQL 18 остаётся отдельным owner-approved релизом:

- тот же регион и частная сеть, что у AMS Main Server;
- без публичного database IP;
- TLS, раздельные DB identities и `NOBYPASSRLS` для runtime;
- backup, restore smoke, row counts и isolation proof;
- старая БД read-only 14 дней после подтверждённого cutover.

## Следующие Продуктовые Эпики

1. Договоры.
2. Счета.
3. Презентации.
4. Клон сайтов.
5. АМС Лиды.
6. Внутренний AI-агент поверх Research application contract.

Каждый пункт - отдельная ветка, PR, review и risk-based gate.

## Операционные Задачи

- завершить безопасное подключение существующих SEO provider mappings;
- подтвердить SourceCraft secret scanning;
- завершить sanitation GitHub mirror до public visibility;
- добавить внешний monitor без публикации readiness body.
