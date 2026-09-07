import type { ReactNode } from "react";
import { MetricTrendChart } from "../../../components/charts/MetricTrendChart.tsx";
import { RankingShareChart } from "../../../components/charts/RankingShareChart.tsx";
import { KpiCard } from "../../../components/dashboard/KpiCard.tsx";
import { PageHeader } from "../../../components/dashboard/PageHeader.tsx";
import { SectionCard } from "../../../components/dashboard/SectionCard.tsx";
import { StatusBanner } from "../../../components/dashboard/StatusBanner.tsx";
import { StatePanel } from "../../../components/states/StatePanel.tsx";
import { DataTable } from "../../../components/tables/DataTable.tsx";
import { TrackedQueryTable } from "../../../components/tables/TrackedQueryTable.tsx";
import { formatDuration, formatInteger, formatPercent, formatPosition } from "../../../shared/format/metrics.ts";
import type { ReportComparison, SiteReportSnapshot } from "../../../shared/schemas/report.ts";
import type { SiteRegistry } from "../../../shared/schemas/registry.ts";

type ComparisonMetric = ReportComparison["metrics"]["shows"];

function formatDelta(metric: ComparisonMetric | undefined, mode: "percent" | "points" | "position" = "percent") {
  const value = mode === "percent" ? metric?.deltaPercent : metric?.deltaPoints;
  if (value === null || value === undefined) return { text: undefined, tone: "neutral" as const };
  if (mode === "position") {
    return {
      text: value > 0 ? `Улучшение на ${Math.abs(value).toFixed(1)}` : value < 0 ? `Ухудшение на ${Math.abs(value).toFixed(1)}` : "Без изменений",
      tone: value > 0 ? ("positive" as const) : value < 0 ? ("negative" as const) : ("neutral" as const),
    };
  }
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(value);
  return {
    text: mode === "points" ? `${formatted} п.п.` : `${formatted}%`,
    tone: value > 0 ? ("positive" as const) : value < 0 ? ("negative" as const) : ("neutral" as const),
  };
}

function factCard(label: string, value: string, note?: string) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      {note ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{note}</p> : null}
    </div>
  );
}

function countDelta(value: number | null, label: string) {
  if (value === null) return "Нет сравнения";
  if (value === 0) return `Без изменений ${label}`;
  return `${value > 0 ? "+" : ""}${value} ${label}`;
}

type SiteReportViewProps = {
  clientName: string;
  site: SiteRegistry;
  snapshot: SiteReportSnapshot | null;
  mode: "fixture" | "live";
  backHref?: string;
  periodControl?: ReactNode;
};

export function SiteReportView({ clientName, site, snapshot, mode, backHref, periodControl }: SiteReportViewProps) {
  if (!snapshot) {
    const sourcesEnabled = site.webmaster.enabled || site.metrica.enabled;
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={clientName} title={site.name} description="Единый отчёт по поисковой видимости, техническому состоянию и органическому трафику." backHref={backHref} />
        {periodControl}
        <StatePanel state={sourcesEnabled ? "stale" : "not-connected"} title={sourcesEnabled ? "Live-отчёт готовится" : "Источники не подключены"} description={sourcesEnabled ? "Данные появятся после успешной публикации snapshot." : "Для отчёта нужны доступы к Яндекс.Вебмастеру и Яндекс.Метрике."} />
      </div>
    );
  }

  const webmaster = snapshot.webmaster;
  const metrica = snapshot.metrica;
  const ranking = snapshot.ranking;
  const health = webmaster?.health ?? null;
  const comparison = snapshot.comparison?.metrics;
  const periodStart = snapshot.sources.webmaster.periodStart ?? snapshot.sources.metrica.periodStart;
  const periodEnd = snapshot.sources.webmaster.periodEnd ?? snapshot.sources.metrica.periodEnd;
  const periodLabel = periodStart && periodEnd ? `${periodStart} — ${periodEnd}` : "период источника";
  const showsDelta = formatDelta(comparison?.shows);
  const clicksDelta = formatDelta(comparison?.clicks);
  const ctrDelta = formatDelta(comparison?.ctr, "points");
  const positionDelta = formatDelta(comparison?.avgPosition, "position");
  const visitsDelta = formatDelta(comparison?.organicVisits);
  const targetsDelta = formatDelta(comparison?.targetVisits);
  const conversionDelta = formatDelta(comparison?.conversionRate, "points");
  const topAlert = snapshot.combined.alerts[0] ?? null;
  const topOpportunity = snapshot.combined.opportunities[0] ?? null;
  const healthTone = health?.status === "critical" ? "error" : health?.status === "attention" ? "warning" : "success";
  const healthTitle = health?.status === "critical" ? "Есть критичные проблемы" : health?.status === "attention" ? "Сайт требует внимания" : "Сайт работает стабильно";

  return (
    <div className="w-[calc(100vw-2rem)] min-w-0 max-w-full space-y-8 sm:w-[calc(100vw-3rem)] lg:w-auto">
      <PageHeader eyebrow={clientName} title={site.name} description={`Единый отчёт за ${periodLabel}. Обновлён ${new Date(snapshot.generatedAt).toLocaleString("ru-RU")}.`} backHref={backHref} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {periodControl}
        <p className="text-xs text-[var(--muted-foreground)]">{mode === "live" ? "Live-данные" : "Демонстрационные данные"}</p>
      </div>

      {ranking ? (
        <section className="space-y-4" aria-labelledby="ranking-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Поисковое ядро</p>
              <h2 id="ranking-title" className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Позиции утверждённых запросов</h2>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {ranking.source === "topvisor" && ranking.lastCapturedAt
                ? `Последний съём Topvisor: ${ranking.lastCapturedAt}`
                : `Исходный снимок · сравнение с ${ranking.baselineLabel}`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Ядро запросов"
              value={formatInteger(ranking.queryCount)}
              delta={`${ranking.measuredCount} с текущей позицией`}
              deltaTone="neutral"
            />
            <KpiCard
              label="Запросы в Топ-10"
              value={`${ranking.top10Count} из ${ranking.queryCount}`}
              tone="primary"
              delta={`${formatPercent(ranking.top10Share)} · ${countDelta(ranking.top10Delta, "к началу периода")}`}
              deltaTone={(ranking.top10Delta ?? 0) > 0 ? "positive" : (ranking.top10Delta ?? 0) < 0 ? "negative" : "neutral"}
            />
            <KpiCard
              label="Запросы в Топ-3"
              value={`${ranking.top3Count} из ${ranking.queryCount}`}
              tone="soft"
              delta={`${formatPercent(ranking.top3Share)} · ${countDelta(ranking.top3Delta, "к началу периода")}`}
              deltaTone={(ranking.top3Delta ?? 0) > 0 ? "positive" : (ranking.top3Delta ?? 0) < 0 ? "negative" : "neutral"}
            />
            <KpiCard
              label="Динамика ядра"
              value={`+${ranking.improvedCount} / −${ranking.declinedCount}`}
              delta={`Новые ${ranking.newCount} · потеряны ${ranking.lostCount}`}
              deltaTone={ranking.improvedCount > ranking.declinedCount ? "positive" : ranking.declinedCount > ranking.improvedCount ? "negative" : "neutral"}
            />
          </div>
          <RankingShareChart ranking={ranking} />
          <SectionCard title="Поисковые запросы" note={`${ranking.measuredCount} из ${ranking.queryCount} с текущей позицией`}>
            <TrackedQueryTable ranking={ranking} />
          </SectionCard>
        </section>
      ) : null}

      {health ? (
        <section className="space-y-4" aria-labelledby="health-title">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Состояние сайта</p>
            <h2 id="health-title" className="max-w-full break-words text-2xl font-semibold text-[var(--foreground)]">Индексация и техническое здоровье</h2>
          </div>
          <StatusBanner tone={healthTone} title={healthTitle} description={`${health.fatalCount + health.criticalCount} критичных диагностик, ${health.possibleProblemCount} возможных проблем; HTTP 5xx: ${health.http5xx}; Sitemap: ${health.sitemapErrors} ошибок.`} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {factCard("Страницы в поиске", formatInteger(health.pagesInSearch), `${formatInteger(health.excludedPages)} исключено`)}
            {factCard("Sitemap", formatInteger(health.sitemapUrls), health.sitemapErrors > 0 ? `${health.sitemapErrors} ошибок` : "без ошибок")}
            {factCard("Обновление поиска", health.searchBalance >= 0 ? `+${formatInteger(health.searchBalance)}` : formatInteger(health.searchBalance), `${health.appearedInSearch} появилось · ${health.removedFromSearch} удалено`)}
            {factCard("ИКС", formatInteger(health.sqi), health.sqiDelta === null ? "нет сравнения" : `${health.sqiDelta > 0 ? "+" : ""}${health.sqiDelta} к прошлому замеру`)}
          </div>
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby="seo-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">SEO-результат</p>
          <h2 id="seo-title" className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Видимость в поиске Яндекса</h2>
        </div>
        {webmaster ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Показы" value={formatInteger(webmaster.summary.shows)} tone="primary" delta={showsDelta.text} deltaTone={showsDelta.tone} />
              <KpiCard label="Клики" value={formatInteger(webmaster.summary.clicks)} delta={clicksDelta.text} deltaTone={clicksDelta.tone} />
              <KpiCard label="CTR" value={formatPercent(webmaster.summary.ctr, 2)} delta={ctrDelta.text} deltaTone={ctrDelta.tone} />
              <KpiCard label="Средняя позиция" value={formatPosition(webmaster.summary.avgPosition)} delta={positionDelta.text} deltaTone={positionDelta.tone} />
            </div>
            <MetricTrendChart title="Динамика показов и кликов" subtitle="Ежедневные значения по всем запросам сайта." data={webmaster.visibilityTrend} metricLabel="Показы" secondaryMetricLabel="Клики" tertiaryMetricLabel="Средняя позиция" />
          </>
        ) : <StatePanel state="empty" title="Нет данных Вебмастера" description="Источник не подключён или временно недоступен." />}
      </section>

      <section className="space-y-4" aria-labelledby="traffic-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Трафик</p>
          <h2 id="traffic-title" className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Органические визиты и целевые действия</h2>
        </div>
        {metrica ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Органические визиты" value={formatInteger(metrica.summary.visits)} tone="primary" delta={visitsDelta.text} deltaTone={visitsDelta.tone} />
              <KpiCard label="Целевые визиты" value={formatInteger(metrica.summary.targetVisits)} tone="soft" delta={targetsDelta.text} deltaTone={targetsDelta.tone} />
              <KpiCard label="Конверсия" value={formatPercent(metrica.summary.conversionRate)} tone="success" delta={conversionDelta.text} deltaTone={conversionDelta.tone} />
              <KpiCard label="Среднее время" value={formatDuration(metrica.summary.averageVisitDurationSeconds)} />
            </div>
            <MetricTrendChart title="Органический трафик" subtitle="Визиты и целевые визиты из поиска Яндекса." data={metrica.organicTrend} metricLabel="Визиты" secondaryMetricLabel="Целевые визиты" tertiaryMetricLabel="Конверсия" />
            <SectionCard title="Посадочные страницы" note="Основные входы из органического поиска">
              <DataTable caption="Эффективность посадочных страниц" columns={["Страница", "Визиты", "Целевые визиты", "Конверсия", "Отказы"]} rows={metrica.landingPages.slice(0, 10).map((page) => ({ key: page.path, cells: [<span key="path" className="font-semibold text-[var(--foreground)]">{page.path}</span>, formatInteger(page.visits), formatInteger(page.targetVisits), formatPercent(page.conversionRate), formatPercent(page.bounceRate)] }))} />
            </SectionCard>
          </>
        ) : <StatePanel state="empty" title="Нет данных Метрики" description="Источник не подключён или временно недоступен." />}
      </section>

      <SectionCard title="Что делать дальше" note="Приоритеты по фактическим данным">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-[var(--muted)] p-4"><p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Главный риск</p><p className="mt-2 font-semibold">{topAlert?.title ?? "Критичных рисков не обнаружено"}</p>{topAlert ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{topAlert.summary}</p> : null}</div>
          <div className="rounded-xl bg-[var(--muted)] p-4"><p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Точка роста</p><p className="mt-2 font-semibold">{topOpportunity?.title ?? "Сохранить текущий курс"}</p>{topOpportunity ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{topOpportunity.summary}</p> : null}</div>
        </div>
      </SectionCard>

      <footer className="border-t border-[var(--border)] pt-5 text-xs leading-5 text-[var(--muted-foreground)]">
        <p>Источники: Topvisor или утверждённый исходный снимок — точные позиции ядра; Яндекс.Вебмастер — спрос, индексация и диагностика; Яндекс.Метрика — обезличенный трафик и целевые действия.</p>
        <p>Позиция Вебмастера остаётся средней позицией показа за период и не подменяет rank-check. Клики и визиты считаются разными системами.</p>
      </footer>
    </div>
  );
}
