# MASTER PLAN

Документ содержит только незавершённую работу. Реализованные изменения сохраняются в Git и SourceCraft.

## Ближайший Этап

1. Выполнить первый подтверждённый тестовый запуск Исследования через MCP после проверки серверной оценки стоимости.
2. Проверить историю запуска, карту конкурентов и приватный CSV на отдельном тестовом проекте.
3. Подтвердить OAuth/MCP на двух остальных локальных компьютерах.
4. Проверить PWA на реальных Windows, Android и iOS устройствах.

## Стабилизация Research

- выполнить OAuth/MCP smoke из Codex на каждом из трёх локальных компьютеров;
- проверить кабинет на `375`, `768`, `1280`, `1440` с реальной test DB;
- проверить установку PWA на Windows, Android и iOS home screen;
- подтвердить короткоживущую S3-ссылку CSV в полном пользовательском сценарии;
- проверить восстановление Research job после контролируемого перезапуска worker;
- добавить Research-уведомления, cancellation UI и partial-run semantics отдельными эпиками.

## Следующие Продуктовые Эпики

1. Договоры.
2. Счета.
3. Презентации.
4. Клон сайтов.
5. АМС Лиды.
6. Внутренний AI-агент поверх Research application contract.

Каждый пункт - отдельная ветка, PR, review и risk-based gate.

## Операционные Задачи

- до `2026-09-25` проверить стабильность managed PostgreSQL и только отдельным решением удалить прежнюю read-only БД;
- до включения `FORCE RLS` автоматизировать fresh physical-backup proof Timeweb в release gate; логический backup без `BYPASSRLS` намеренно блокируется;
- после ротации Timeweb API token сохранить новый операторский токен в AMS IMPULSE Doppler через identity с write-доступом;
- синхронизировать ротированные DB credentials в AMS IMPULSE Doppler, не меняя раздельные runtime identities;
- завершить безопасное подключение существующих SEO provider mappings;
- подтвердить SourceCraft secret scanning;
- завершить sanitation GitHub mirror до public visibility;
- добавить внешний monitor без публикации readiness body.
