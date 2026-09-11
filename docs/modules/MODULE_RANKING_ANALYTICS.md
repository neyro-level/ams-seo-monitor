# Module: Ranking Analytics

## Purpose

Pure domain module for approved query-core ranking semantics: exact positions, Top-3/Top-10 share, coverage and movement.

## Not In Scope

Provider calls, persistence ownership, tenant lookup, Webmaster average position as exact rank, cross-site ranking KPI and browser mutations.

## Ownership

Calculation logic in `src/modules/ranking-analytics`. Persistence belongs to Project Registry/Data Ingestion; presentation belongs to Reporting.

## Inputs

Already-authorized dataset for one site:

- approved enabled query core;
- exact Topvisor captures or labelled owner-provided baseline;
- engine/device/region dimensions;
- current and previous period snapshots.

## Invariants

- Denominator is the full enabled approved query set.
- Top-3 is a subset of Top-10.
- Lower position is better.
- Improvement means current position is lower than previous.
- Missing position remains null/unmeasured.
- Provider absence never becomes position zero.
- Source, baseline/capture label and measured count remain visible.

## Tests

Normalization, uniqueness, denominator, Top-3/Top-10 subset, movement semantics, missing data and browser-safe serialization.
