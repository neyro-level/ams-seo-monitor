# Module: Ranking Analytics

## Назначение

Показывает позиции утверждённого поискового ядра, доли Top-3/Top-10 и динамику tracked queries. Webmaster average show position остаётся отдельной метрикой и не заменяет exact rank.

## Ownership

- runtime model: `TrackedQuerySet`, `TrackedQuery`, `RankingCapture` в Prisma;
- seed input: `config/tracked-queries/*`;
- schemas: `src/shared/schemas/tracked-query.ts`, `rank-source.ts`, `report.ts`;
- optional source: `collector/sources/topvisor/client.ts`;
- compiler: `src/domain/reports/report-compiler.ts`;
- UI: `RankingShareChart.tsx`, `TrackedQueryTable.tsx`.

## Sources

- `TOPVISOR` — exact read-only capture history;
- `OWNER_PROVIDED` — labelled baseline/current input when live mapping is not enabled.

Topvisor checker runs, keyword import/edit/delete и paid mutations запрещены.

## Invariants

- query unique по normalized text внутри set;
- active denominator = полное утверждённое ядро, включая unmeasured queries;
- Top-3 является подмножеством Top-10;
- меньшая числовая позиция лучше;
- improvement: current < previous;
- decline: current > previous;
- `new/lost` требуют exact previous capture;
- nullable owner baseline не превращается в `new/lost`;
- source, baseline/capture labels и measured count видимы;
- разные sites не агрегируются в fake rank;
- credentials/internal transport data не входят в report DTO.

## Calculations

```text
top3Share  = top3Count  / queryCount × 100
top10Share = top10Count / queryCount × 100
```

Position delta остаётся согласован с UI contract: положительное improvement означает движение к меньшему числу позиции.

## Проверки

- tracked set uniqueness/expected count;
- denominator includes unmeasured queries;
- Top-3 subset Top-10;
- exact vs nullable baseline movement;
- Topvisor allowlisted read-only endpoints;
- DB RankingCapture uniqueness;
- browser-safe report serialization;
- local mobile table overflow only, без whole-page overflow.
