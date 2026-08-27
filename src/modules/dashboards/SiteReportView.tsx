import type { ReactNode } from "react";
import { MetricTrendChart } from "../../components/charts/MetricTrendChart";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { PageHeader } from "../../components/dashboard/PageHeader";
import { ReportTabs } from "../../components/dashboard/ReportTabs";
import { SectionCard } from "../../components/dashboard/SectionCard";
import { StatusBanner } from "../../components/dashboard/StatusBanner";
import { StatePanel } from "../../components/states/StatePanel";
import { DataTable } from "../../components/tables/DataTable";
import {
  formatDuration,
  formatInteger,
  formatPercent,
  formatPosition,
} from "../../shared/format/metrics";
import type {
  ReportComparison,
  SiteReportSnapshot,
  WebmasterReport,
} from "../../shared/schemas/report";
import type { SiteRegistry } from "../../shared/schemas/registry";

type ComparisonMetric = ReportComparison["metrics"]["shows"];

function formatDelta(
  metric: ComparisonMetric | undefined,
  mode: "percent" | "points" | "position" = "percent",
) {
  const value = mode === "percent" ? metric?.deltaPercent : metric?.deltaPoints;
  if (value === null || value === undefined) {
    return { text: undefined, tone: "neutral" as const };
  }

  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(value);

  if (mode === "position") {
    return {
      text:
        value > 0
          ? `Улучшение на ${Math.abs(value).toFixed(1)}`
          : value < 0
            ? `Ухудшение на ${Math.abs(value).toFixed(1)}`
            : "Без изменений",
      tone: value > 0 ? ("positive" as const) : value < 0 ? ("negative" as const) : ("neutral" as const),
    };
  }

  return {
    text: mode === "points" ? `${formatted} п.п.` : `${formatted}%`,
    tone: value > 0 ? ("positive" as const) : value < 0 ? ("negative" as const) : ("neutral" as const),
  };
}

function buildClusterSummary(queries: WebmasterReport["queries"]) {
  const clusters = new Map<
    string,
    { label: string; shows: number; clicks: number }
  >();

  for (const query of queries) {
    if (query.device !== "ALL") continue;
    const current = clusters.get(query.cluster) ?? {
      label: query.cluster,
      shows: 0,
      clicks: 0,
    };
    current.shows += query.shows;
    current.clicks += query.clicks;
    clusters.set(query.cluster, current);
  }

  return [...clusters.values()]
    .sort((left, right) => right.shows - left.shows)
    .slice(0, 5);
}

type SiteReportViewProps = {
  clientName: string;
  site: SiteRegistry;
  snapshot: SiteReportSnapshot | null;
  mode: "fixture" | "live";
  backHref?: string;
  periodControl?: ReactNode;
};

export function SiteReportView({
  clientName,
  site,
  snapshot,
  mode,
  backHref,
  periodControl,
}: SiteReportViewProps) {
  if (!snapshot) {
    const sourcesEnabled = site.webmaster.enabled || site.metrica.enabled;

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={clientName}
          title={site.name}
          description={
            sourcesEnabled
              ? "Webmaster и Метрика подключены. Следующий блок публикует единый live snapshot для кабинета."
              : "Сайт сохранён в структуре клиента, но источники данных ещё не подключены."
          }
          backHref={backHref}
        />
        <StatePanel
          state={sourcesEnabled ? "stale" : "not-connected"}
          title={sourcesEnabled ? "Live-отчёт готовится" : "Не подключён"}
          description={
            sourcesEnabled
              ? "Мы не показываем демонстрационные данные как реальные. До завершения report compiler откройте demo route для проверки интерфейса."
              : "После подтверждения URL, Webmaster host и Metrica counter здесь появится отдельный отчёт сайта."
          }
        />
      </div>
    );
  }

  const webmaster = snapshot.webmaster;
  const metrica = snapshot.metrica;
  const topOpportunity = snapshot.combined.opportunities[0] ?? null;
  const topAlert = snapshot.combined.alerts[0] ?? null;
  const periodStart =
    snapshot.sources.webmaster.periodStart ?? snapshot.sources.metrica.periodStart;
  const periodEnd = snapshot.sources.webmaster.periodEnd ?? snapshot.sources.metrica.periodEnd;
  const periodLabel =
    periodStart && periodEnd ? `${periodStart} — ${periodEnd}` : "Фактический период источника";
  const showsDelta = formatDelta(snapshot.comparison?.metrics.shows);
  const clicksDelta = formatDelta(snapshot.comparison?.metrics.clicks);
  const organicVisitsDelta = formatDelta(snapshot.comparison?.metrics.organicVisits);
  const targetVisitsDelta = formatDelta(snapshot.comparison?.metrics.targetVisits);
  const conversionDelta = formatDelta(
    snapshot.comparison?.metrics.conversionRate,
    "points",
  );
  const pagesDelta = formatDelta(snapshot.comparison?.metrics.pagesInSearch);
  const ctrDelta = formatDelta(snapshot.comparison?.metrics.ctr, "points");
  const positionDelta = formatDelta(
    snapshot.comparison?.metrics.avgPosition,
    "position",
  );
  const organicShare =
    metrica && metrica.summary.allVisits > 0
      ? (metrica.summary.visits / metrica.summary.allVisits) * 100
      : null;
  const organicShareDelta = formatDelta(
    snapshot.comparison?.metrics.organicShare,
    "points",
  );
  const mainResult =
    organicVisitsDelta.text && organicVisitsDelta.tone !== "neutral"
      ? `Органические визиты: ${organicVisitsDelta.text}`
      : clicksDelta.text && clicksDelta.tone !== "neutral"
        ? `Клики из поиска: ${clicksDelta.text}`
        : "Недостаточно данных для сравнения";
  const recommendedAction = topAlert
    ? "Сначала устранить главный риск и проверить обновление источников."
    : topOpportunity
      ? "Проверить посадочную страницу и поисковый сниппет приоритетного запроса."
      : "Сохранить текущий курс и контролировать следующий период.";
  const clusterSummary = webmaster ? buildClusterSummary(webmaster.queries) : [];

  const summary = (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Показы в поиске"
          value={formatInteger(webmaster?.summary.shows ?? null)}
          tone="primary"
          delta={showsDelta.text}
          deltaTone={showsDelta.tone}
        />
        <KpiCard
          label="Клики из поиска"
          value={formatInteger(webmaster?.summary.clicks ?? null)}
          delta={clicksDelta.text}
          deltaTone={clicksDelta.tone}
        />
        <KpiCard
          label="Органические визиты"
          value={formatInteger(metrica?.summary.visits ?? null)}
          tone="soft"
          delta={organicVisitsDelta.text}
          deltaTone={organicVisitsDelta.tone}
        />
        <KpiCard
          label="Целевые визиты"
          value={formatInteger(metrica?.summary.targetVisits ?? null)}
          tone="soft"
          delta={targetVisitsDelta.text}
          deltaTone={targetVisitsDelta.tone}
        />
        <KpiCard
          label="Конверсия"
          value={formatPercent(metrica?.summary.conversionRate ?? null)}
          tone="success"
          delta={conversionDelta.text}
          deltaTone={conversionDelta.tone}
        />
        <KpiCard
          label="Страницы в поиске"
          value={formatInteger(webmaster?.summary.pagesInSearch ?? null)}
          delta={pagesDelta.text}
          deltaTone={pagesDelta.tone}
        />
      </section>

      <SectionCard title="Главное за период" note="Управленческая сводка">
        <div className="grid gap-3 xl:grid-cols-4">
          <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
              Главный результат
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--crm-text)]">
              {mainResult}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
              Главная точка роста
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--crm-text)]">
              {topOpportunity?.title ?? "Критичных возможностей не выделено"}
            </p>
            {topOpportunity ? (
              <p className="mt-2 text-sm text-[var(--crm-text-secondary)]">
                {topOpportunity.summary}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
              Главный риск
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--crm-text)]">
              {topAlert?.title ?? "Критичных рисков нет"}
            </p>
            {topAlert ? (
              <p className="mt-2 text-sm text-[var(--crm-text-secondary)]">
                {topAlert.summary}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
              Рекомендуемое действие
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--crm-text)]">
              {recommendedAction}
            </p>
          </div>
        </div>
      </SectionCard>


      <div className="grid gap-4 xl:grid-cols-2">
        {webmaster ? (
          <MetricTrendChart
            title="Видимость в поиске"
            subtitle="Показы и клики по всем запросам сайта."
            data={webmaster.visibilityTrend}
            metricLabel="Показы"
            secondaryMetricLabel="Клики"
            tertiaryMetricLabel="Средняя позиция"
          />
        ) : null}
        {metrica ? (
          <MetricTrendChart
            title="Органический трафик и обращения"
            subtitle="Визиты и уникальные целевые визиты из поиска Яндекса."
            data={metrica.organicTrend}
            metricLabel="Визиты"
            secondaryMetricLabel="Целевые визиты"
            tertiaryMetricLabel="Конверсия"
          />
        ) : null}
      </div>
    </div>
  );

  const seo = (
    <div className="space-y-6">
      {webmaster ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Показы"
              value={formatInteger(webmaster.summary.shows)}
              tone="primary"
              delta={showsDelta.text}
              deltaTone={showsDelta.tone}
            />
            <KpiCard
              label="Клики"
              value={formatInteger(webmaster.summary.clicks)}
              delta={clicksDelta.text}
              deltaTone={clicksDelta.tone}
            />
            <KpiCard
              label="CTR"
              value={formatPercent(webmaster.summary.ctr, 2)}
              delta={ctrDelta.text}
              deltaTone={ctrDelta.tone}
            />
            <KpiCard
              label="Средняя позиция"
              value={formatPosition(webmaster.summary.avgPosition)}
              delta={positionDelta.text}
              deltaTone={positionDelta.tone}
            />
          </section>
          <MetricTrendChart
            title="Видимость Яндекса"
            subtitle="Показы, клики и средняя позиция по фактическому периоду Вебмастера."
            data={webmaster.visibilityTrend}
            metricLabel="Показы"
            secondaryMetricLabel="Клики"
            tertiaryMetricLabel="Средняя позиция"
          />

          {clusterSummary.length > 0 ? (
            <SectionCard title="Темы спроса" note="До 5 кластеров">
              <DataTable
                caption="Темы поискового спроса"
                columns={["Тема", "Показы", "Клики", "CTR"]}
                rows={clusterSummary.map((cluster) => ({
                  key: cluster.label,
                  cells: [
                    <span key="label" className="font-semibold text-[var(--crm-text)]">
                      {cluster.label}
                    </span>,
                    <span key="shows" className="tabular-nums">
                      {formatInteger(cluster.shows)}
                    </span>,
                    <span key="clicks" className="tabular-nums">
                      {formatInteger(cluster.clicks)}
                    </span>,
                    <span key="ctr" className="tabular-nums">
                      {formatPercent(
                        cluster.shows > 0 ? (cluster.clicks / cluster.shows) * 100 : 0,
                        2,
                      )}
                    </span>,
                  ],
                }))}
              />
            </SectionCard>
          ) : null}

          <SectionCard title="Точки роста" note="Детерминированные правила">
            <ul className="grid gap-3 xl:grid-cols-3">
              {snapshot.combined.opportunities.slice(0, 5).map((opportunity) => (
                <li
                  key={opportunity.id}
                  className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-muted)] p-4"
                >
                  <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
                    {opportunity.source}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-[var(--crm-text)]">
                    {opportunity.title}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-[var(--crm-text-secondary)]">
                    {opportunity.summary}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Главные запросы" note="До 5 точек роста">
            <DataTable
              caption="Главные запросы Вебмастера"
              columns={["Запрос", "Показы", "Клики", "CTR", "Позиция", "Возможность"]}
              rows={webmaster.queries.slice(0, 5).map((query) => ({
                key: `${query.queryId}-${query.device}`,
                cells: [
                  <span key="query" className="min-w-[220px] font-semibold text-[var(--crm-text)]">
                    {query.query}
                  </span>,
                  <span key="shows" className="tabular-nums">
                    {formatInteger(query.shows)}
                  </span>,
                  <span key="clicks" className="tabular-nums">
                    {formatInteger(query.clicks)}
                  </span>,
                  <span key="ctr" className="tabular-nums">
                    {formatPercent(query.ctr, 2)}
                  </span>,
                  <span key="position" className="tabular-nums">
                    {formatPosition(query.avgShowPosition)}
                  </span>,
                  query.opportunityType,
                ],
              }))}
            />
          </SectionCard>

          <SectionCard title="Поисковый охват" note="Кратко для руководителя">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
                  Страниц в поиске
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatInteger(webmaster.summary.pagesInSearch)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
                  Исключено
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatInteger(webmaster.summary.excludedPages)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
                  Sitemap
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {webmaster.sitemap
                    ? webmaster.sitemap.errors > 0
                      ? `${webmaster.sitemap.errors} ошибок`
                      : "Без ошибок"
                    : "Не найден"}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
                  Критические проблемы
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {
                    webmaster.diagnostics.filter(
                      (diagnostic) => diagnostic.severity === "error",
                    ).length
                  }
                </p>
              </div>
            </div>
            {webmaster.diagnostics.some((diagnostic) => diagnostic.severity === "error") ? (
              <ul className="mt-4 grid gap-3 xl:grid-cols-3">
                {webmaster.diagnostics
                  .filter((diagnostic) => diagnostic.severity === "error")
                  .slice(0, 3)
                  .map((diagnostic) => (
                    <li
                      key={diagnostic.title}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-4"
                    >
                      <p className="font-semibold text-rose-950">{diagnostic.title}</p>
                      <p className="mt-2 text-sm text-rose-900">{diagnostic.description}</p>
                    </li>
                  ))}
              </ul>
            ) : null}
          </SectionCard>
        </>
      ) : (
        <StatePanel
          state="empty"
          title="Нет данных Вебмастера"
          description="Источник не подключён или временно недоступен."
        />
      )}
    </div>
  );

  const traffic = (
    <div className="space-y-6">
      {metrica ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Органические визиты"
              value={formatInteger(metrica.summary.visits)}
              tone="primary"
              delta={organicVisitsDelta.text}
              deltaTone={organicVisitsDelta.tone}
            />
            <KpiCard
              label="Целевые визиты"
              value={formatInteger(metrica.summary.targetVisits)}
              tone="soft"
              delta={targetVisitsDelta.text}
              deltaTone={targetVisitsDelta.tone}
            />
            <KpiCard
              label="Конверсия"
              value={formatPercent(metrica.summary.conversionRate)}
              tone="success"
              delta={conversionDelta.text}
              deltaTone={conversionDelta.tone}
            />
            <KpiCard
              label="Доля органики"
              value={formatPercent(organicShare)}
              delta={organicShareDelta.text}
              deltaTone={organicShareDelta.tone}
            />
          </section>

          <MetricTrendChart
            title="Органический трафик и обращения"
            subtitle="Визиты и уникальные целевые визиты из поиска Яндекса."
            data={metrica.organicTrend}
            metricLabel="Визиты"
            secondaryMetricLabel="Целевые визиты"
            tertiaryMetricLabel="Конверсия"
          />

          <SectionCard title="Целевые действия" note="До 4 основных типов">
            <DataTable
              caption="Ключевые целевые действия"
              columns={["Действие", "Категория", "Достижения", "Конверсия"]}
              rows={metrica.goals
                .filter((goal) => goal.reaches > 0)
                .slice(0, 4)
                .map((goal) => ({
                  key: `${goal.label}-${goal.category}`,
                  cells: [
                    <span key="label" className="font-semibold text-[var(--crm-text)]">
                      {goal.label}
                    </span>,
                    goal.category,
                    <span key="reaches" className="tabular-nums">
                      {formatInteger(goal.reaches)}
                    </span>,
                    <span key="conversion" className="tabular-nums">
                      {formatPercent(goal.conversionRate)}
                    </span>,
                  ],
                }))}
            />
          </SectionCard>

          <SectionCard title="Лучшие посадочные страницы" note="До 5 страниц">
            <DataTable
              caption="Лучшие посадочные страницы"
              columns={["Страница", "Визиты", "Целевые визиты", "Конверсия"]}
              rows={metrica.landingPages.slice(0, 5).map((page) => ({
                key: page.path,
                cells: [
                  <span key="path" className="min-w-[220px] font-semibold text-[var(--crm-text)]">
                    {page.path}
                  </span>,
                  <span key="visits" className="tabular-nums">
                    {formatInteger(page.visits)}
                  </span>,
                  <span key="targets" className="tabular-nums">
                    {formatInteger(page.targetVisits)}
                  </span>,
                  <span key="conversion" className="tabular-nums">
                    {formatPercent(page.conversionRate)}
                  </span>,
                ],
              }))}
            />
          </SectionCard>

          <SectionCard title="Качество трафика" note="Вторичные показатели">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
                  Отказы
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatPercent(metrica.summary.bounceRate)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
                  Глубина
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {metrica.summary.depth.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
                  Среднее время
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatDuration(metrica.summary.averageVisitDurationSeconds)}
                </p>
              </div>
            </div>
          </SectionCard>
        </>
      ) : (
        <StatePanel
          state="empty"
          title="Нет данных Метрики"
          description="Источник не подключён или временно недоступен."
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={clientName}
        title={mode === "fixture" ? `${site.name} — демонстрация` : site.name}
        description={
          mode === "fixture"
            ? "Демонстрационный набор проверяет структуру, адаптивность и дизайн-систему."
            : "Управленческая SEO-сводка по подтверждённым данным Яндекс.Вебмастера и Яндекс.Метрики."
        }
        actions={
          mode === "live"
            ? periodControl ?? (
                <span className="rounded-xl border border-[var(--crm-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--crm-text-secondary)] shadow-sm">
                  {periodLabel}
                </span>
              )
            : undefined
        }
        backHref={backHref}
      />

      <StatusBanner
        tone={mode === "fixture" ? "info" : "success"}
        title={mode === "fixture" ? "Демонстрационные данные" : "Источники обновлены"}
        description={
          mode === "fixture"
            ? "Этот route не содержит клиентских live-данных."
            : "Фактические периоды и актуальность каждого источника указаны в отчёте."
        }
      />

      <ReportTabs summary={summary} seo={seo} traffic={traffic} />
    </div>
  );
}
