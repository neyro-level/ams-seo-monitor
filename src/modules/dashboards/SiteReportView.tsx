import type { ReactNode } from "react";
import { MetricTrendChart } from "../../components/charts/MetricTrendChart";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { PageHeader } from "../../components/dashboard/PageHeader";
import { SectionCard } from "../../components/dashboard/SectionCard";
import { StatusBanner } from "../../components/dashboard/StatusBanner";
import { StatePanel } from "../../components/states/StatePanel";
import { DataTable } from "../../components/tables/DataTable";
import { TrackedQueryTable } from "../../components/tables/TrackedQueryTable";
import { formatDuration, formatInteger, formatPercent, formatPosition } from "../../shared/format/metrics";
import type { ReportComparison, SiteReportSnapshot } from "../../shared/schemas/report";
import type { SiteRegistry } from "../../shared/schemas/registry";

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
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-muted)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--crm-text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--crm-text)]">{value}</p>
      {note ? <p className="mt-1 text-xs text-[var(--crm-text-secondary)]">{note}</p> : null}
    </div>
  );
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
        <p className="text-xs text-[var(--crm-text-muted)]">{mode === "live" ? "Live-данные" : "Демонстрационные данные"}</p>
      </div>

      {health ? (
        <section className="space-y-4" aria-labelledby="health-title">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--crm-primary)]">Состояние сайта</p>
            <h2 id="health-title" className="max-w-full break-words text-2xl font-semibold text-[var(--crm-text)]">Индексация и техническое здоровье</h2>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--crm-primary)]">SEO-результат</p>
          <h2 id="seo-title" className="mt-1 text-2xl font-semibold text-[var(--crm-text)]">Видимость в поиске Яндекса</h2>
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
            {webmaster.trackedCore ? (
              <SectionCard title="Отслеживаемое поисковое ядро" note={`${webmaster.trackedCore.observedCount} из ${webmaster.trackedCore.expectedCount} запросов найдено в Вебмастере`}>
                <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  {factCard("Покрытие", formatPercent(webmaster.trackedCore.coveragePercent))}
                  {factCard("Топ-3", formatInteger(webmaster.trackedCore.top3Count))}
                  {factCard("4–10", formatInteger(webmaster.trackedCore.top10Count))}
                  {factCard("11–20", formatInteger(webmaster.trackedCore.top20Count))}
                  {factCard("Ниже 20", formatInteger(webmaster.trackedCore.below20Count))}
                  {factCard("Нет замера", formatInteger(webmaster.trackedCore.unmeasuredCount))}
                </div>
                <TrackedQueryTable core={webmaster.trackedCore} />
              </SectionCard>
            ) : (
              <SectionCard title="Наблюдаемые запросы" note="Данные Яндекс.Вебмастера">
                <DataTable caption="Запросы, по которым сайт показывался" columns={["Запрос", "Показы", "Клики", "CTR", "Позиция"]} rows={webmaster.queries.filter((query) => query.device === "ALL").slice(0, 20).map((query) => ({ key: query.queryId, cells: [query.query, formatInteger(query.shows), formatInteger(query.clicks), formatPercent(query.ctr, 2), formatPosition(query.avgShowPosition)] }))} />
              </SectionCard>
            )}
          </>
        ) : <StatePanel state="empty" title="Нет данных Вебмастера" description="Источник не подключён или временно недоступен." />}
      </section>

      <section className="space-y-4" aria-labelledby="traffic-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--crm-primary)]">Трафик</p>
          <h2 id="traffic-title" className="mt-1 text-2xl font-semibold text-[var(--crm-text)]">Органические визиты и целевые действия</h2>
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
              <DataTable caption="Эффективность посадочных страниц" columns={["Страница", "Визиты", "Целевые визиты", "Конверсия", "Отказы"]} rows={metrica.landingPages.slice(0, 10).map((page) => ({ key: page.path, cells: [<span key="path" className="font-semibold text-[var(--crm-text)]">{page.path}</span>, formatInteger(page.visits), formatInteger(page.targetVisits), formatPercent(page.conversionRate), formatPercent(page.bounceRate)] }))} />
            </SectionCard>
          </>
        ) : <StatePanel state="empty" title="Нет данных Метрики" description="Источник не подключён или временно недоступен." />}
      </section>

      <SectionCard title="Что делать дальше" note="Приоритеты по фактическим данным">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4"><p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">Главный риск</p><p className="mt-2 font-semibold">{topAlert?.title ?? "Критичных рисков не обнаружено"}</p>{topAlert ? <p className="mt-1 text-sm text-[var(--crm-text-secondary)]">{topAlert.summary}</p> : null}</div>
          <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4"><p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">Точка роста</p><p className="mt-2 font-semibold">{topOpportunity?.title ?? "Сохранить текущий курс"}</p>{topOpportunity ? <p className="mt-1 text-sm text-[var(--crm-text-secondary)]">{topOpportunity.summary}</p> : null}</div>
        </div>
      </SectionCard>

      <footer className="border-t border-[var(--crm-border)] pt-5 text-xs leading-5 text-[var(--crm-text-muted)]">
        <p>Источники: Яндекс.Вебмастер — видимость, индексация и диагностика; Яндекс.Метрика — обезличенный трафик и целевые действия.</p>
        <p>Позиция Вебмастера — средняя позиция показа за период, а не точный ежедневный rank-check. Клики и визиты считаются разными системами.</p>
      </footer>
    </div>
  );
}
