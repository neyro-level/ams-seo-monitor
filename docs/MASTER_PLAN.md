# MASTER PLAN

Только незавершённая работа. Завершённые этапы остаются в Git и SourceCraft.

## Программа Модульной Платформы

Каждый эпик выполняется в отдельной stacked-ветке и отдельном Pull Request. PR остаются открытыми до завершения программы, затем проходят review и сливаются последовательно.

1. `work/research-module-planning` - продуктовый, security и Research contract.
2. `work/platform-modular-core` - реестры продуктов/инструментов, нейтральное ядро, `ANALYST`.
3. `work/access-control-foundation` - единый Authorization Service и явные project grants.
4. `work/product-data-foundation` - product schemas, composite constraints, RLS и managed PostgreSQL readiness.
5. `work/tools-research-domain` - Tools organizations/projects и Research domain.
6. `work/research-execution` - XMLRiver, budget confirmation, queue и worker.
7. `work/research-mcp` - OAuth 2.1 + PKCE и bounded MCP tools.
8. `work/tools-research-cabinet` - server-authorized кабинет «Исследования».
9. `work/pwa-mobile-shell` - installable shell без кэширования private data.
10. `work/final-documentation-sync` - финальная сверка канона с кодом.

## Продуктовые Ограничения

- SEO Монитор, АМС Лиды и Инструменты имеют отдельные organization/project registries.
- Модули внутри Инструментов используют общий `ToolsOrganization -> ToolsProject`.
- Ни одна клиентская или analyst роль не получает продукт автоматически.
- Каждый клиентский проект назначается явно; доступа ко всем будущим проектам нет.
- Исследования доступны только через явный Tools grant.
- Production database migration и release выполняются только по отдельной команде владельца.

## Следующие Модули

После стабильного Research MVP отдельными программами реализуются:

1. Договоры.
2. Счета.
3. Презентации.
4. Клон сайтов.
5. АМС Лиды.
6. Внутренний AI-агент поверх детерминированного Research contract.

## Существующие Операционные Задачи

- завершить безопасное подключение существующих SEO provider mappings;
- независимо подтвердить SourceCraft secret scanning;
- завершить sanitation GitHub mirror до public visibility;
- добавить внешний monitor без публикации readiness body.
