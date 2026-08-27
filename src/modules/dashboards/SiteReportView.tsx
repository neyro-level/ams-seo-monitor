import { DeviceBarChart } from "../../components/charts/DeviceBarChart";
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
import type { SiteReportSnapshot } from "../../shared/schemas/report";
import type { SiteRegistry } from "../../shared/schemas/registry";

type SiteReportViewProps = {
  clientName: string;
  site: SiteRegistry;
  snapshot: SiteReportSnapshot | null;
  mode: "fixture" | "live";
  backHref?: string;
};

export function SiteReportView({
  clientName,
  site,
  snapshot,
  mode,
  backHref,
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

  const summary = (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Показы в Яндексе"
          value={formatInteger(webmaster?.summary.shows ?? null)}
          tone="primary"
        />
        <KpiCard
          label="Клики из поиска"
          value={formatInteger(webmaster?.summary.clicks ?? null)}
        />
        <KpiCard label="CTR" value={formatPercent(webmaster?.summary.ctr ?? null, 2)} />
        <KpiCard
          label="Средняя позиция"
          value={formatPosition(webmaster?.summary.avgPosition ?? null)}
        />
        <KpiCard
          label="Органические визиты"
          value={formatInteger(metrica?.summary.visits ?? null)}
          tone="soft"
        />
        <KpiCard
          label="Посетители"
          value={formatInteger(metrica?.summary.users ?? null)}
          tone="soft"
        />
        <KpiCard
          label="Достижения целей"
          value={formatInteger(metrica?.summary.goalReaches ?? null)}
          tone="soft"
        />
        <KpiCard
          label="Конверсия"
          value={formatPercent(metrica?.summary.conversionRate ?? null)}
          tone="success"
        />
      </section>

      <SectionCard title="Главное за период" note="Управленческая сводка">
        <div className="grid gap-3 xl:grid-cols-3">
          <div className="rounded-xl bg-[var(--crm-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
              Актуальность
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--crm-text)]">
              {snapshot.freshness === "fresh" ? "Данные актуальны" : "Требует внимания"}
            </p>
            <p className="mt-2 text-sm text-[var(--crm-text-secondary)]">
              Обновлено: {new Date(snapshot.generatedAt).toLocaleString("ru-RU")}
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
        </div>
      </SectionCard>

      <SectionCard title="Путь из поиска" note="Источники считаются отдельно">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Показы" value={formatInteger(snapshot.combined.funnel.shows)} />
          <KpiCard label="Клики" value={formatInteger(snapshot.combined.funnel.clicks)} />
          <KpiCard label="Визиты" value={formatInteger(snapshot.combined.funnel.visits)} />
          <KpiCard label="Цели" value={formatInteger(snapshot.combined.funnel.goalReaches)} />
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-[var(--crm-text-secondary)] lg:grid-cols-2">
          {snapshot.combined.funnel.caveats.map((caveat) => (
            <li key={caveat} className="rounded-xl bg-[var(--crm-surface-muted)] px-3 py-2">
              {caveat}
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {webmaster ? (
          <MetricTrendChart
            title="Видимость Яндекса"
            subtitle="Показы и клики по наблюдаемому пулу запросов."
            data={webmaster.visibilityTrend}
            metricLabel="Показы"
            secondaryMetricLabel="Клики"
            tertiaryMetricLabel="Средняя позиция"
          />
        ) : null}
        {metrica ? (
          <MetricTrendChart
            title="Органический трафик"
            subtitle="Визиты и достижения целей из поиска Яндекса."
            data={metrica.organicTrend}
            metricLabel="Визиты"
            secondaryMetricLabel="Цели"
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
          <MetricTrendChart
            title="Видимость Яндекса"
            subtitle="Показы, клики и средняя позиция по фактическому периоду Вебмастера."
            data={webmaster.visibilityTrend}
            metricLabel="Показы"
            secondaryMetricLabel="Клики"
            tertiaryMetricLabel="Средняя позиция"
          />

          <SectionCard title="Точки роста" note="Детерминированные правила">
            <ul className="grid gap-3 xl:grid-cols-3">
              {snapshot.combined.opportunities.map((opportunity) => (
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

          <SectionCard title="Запросы" note="Таблица прокручивается локально">
            <DataTable
              caption="Запросы Вебмастера"
              columns={[
                "Запрос",
                "Кластер",
                "Показы",
                "Клики",
                "CTR",
                "Позиция",
                "Устройство",
                "Возможность",
              ]}
              rows={webmaster.queries.map((query) => ({
                key: query.queryId,
                cells: [
                  <div key="query" className="min-w-[220px]">
                    <p className="font-semibold text-[var(--crm-text)]">{query.query}</p>
                    <p className="mt-1 text-xs text-[var(--crm-text-muted)]">
                      ID: {query.queryId}
                    </p>
                  </div>,
                  query.cluster,
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
                  query.device,
                  query.opportunityType,
                ],
              }))}
            />
          </SectionCard>

          <SectionCard title="Диагностика и sitemap" note="Техническое состояние">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <ul className="space-y-3">
                {webmaster.diagnostics.map((diagnostic) => (
                  <li
                    key={diagnostic.title}
                    className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-muted)] p-4"
                  >
                    <p className="text-xs font-semibold uppercase text-[var(--crm-text-muted)]">
                      {diagnostic.severity}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-[var(--crm-text)]">
                      {diagnostic.title}
                    </h3>
                    <p className="mt-2 text-sm leading-5 text-[var(--crm-text-secondary)]">
                      {diagnostic.description}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-muted)] p-4 text-sm text-[var(--crm-text-secondary)]">
                <p>
                  <span className="font-semibold text-[var(--crm-text)]">Sitemap:</span>{" "}
                  {webmaster.sitemap?.url ?? "Не найден"}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-[var(--crm-text)]">URLs:</span>{" "}
                  {formatInteger(webmaster.sitemap?.urls)}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-[var(--crm-text)]">Ошибки:</span>{" "}
                  {formatInteger(webmaster.sitemap?.errors)}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-[var(--crm-text)]">Внешние ссылки:</span>{" "}
                  {formatInteger(webmaster.links.external)}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-[var(--crm-text)]">
                    Битые внутренние:
                  </span>{" "}
                  {formatInteger(webmaster.links.brokenInternal)}
                </p>
              </div>
            </div>
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
          <MetricTrendChart
            title="Органический трафик"
            subtitle="Визиты из поиска Яндекса по фактическому периоду Метрики."
            data={metrica.organicTrend}
            metricLabel="Визиты"
            secondaryMetricLabel="Цели"
            tertiaryMetricLabel="Конверсия"
          />

          <SectionCard title="Посадочные страницы" note="Трафик из Яндекса">
            <DataTable
              caption="Посадочные страницы Метрики"
              columns={[
                "Страница",
                "Визиты",
                "Пользователи",
                "Просмотры",
                "Отказы",
                "Глубина",
                "Время",
                "Цели",
                "Конверсия",
              ]}
              rows={metrica.landingPages.map((page) => ({
                key: page.path,
                cells: [
                  <div key="path" className="min-w-[180px]">
                    <p className="font-semibold text-[var(--crm-text)]">{page.path}</p>
                    <p className="mt-1 text-xs text-[var(--crm-text-muted)]">
                      {page.trendLabel}
                    </p>
                  </div>,
                  <span key="visits" className="tabular-nums">
                    {formatInteger(page.visits)}
                  </span>,
                  <span key="users" className="tabular-nums">
                    {formatInteger(page.users)}
                  </span>,
                  <span key="views" className="tabular-nums">
                    {formatInteger(page.pageviews)}
                  </span>,
                  <span key="bounce" className="tabular-nums">
                    {formatPercent(page.bounceRate)}
                  </span>,
                  <span key="depth" className="tabular-nums">
                    {page.depth.toFixed(1)}
                  </span>,
                  <span key="duration" className="tabular-nums">
                    {formatDuration(page.durationSeconds)}
                  </span>,
                  <span key="goals" className="tabular-nums">
                    {formatInteger(page.goals)}
                  </span>,
                  <span key="conversion" className="tabular-nums">
                    {formatPercent(page.conversionRate)}
                  </span>,
                ],
              }))}
            />
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <DeviceBarChart data={metrica.devices} />
            <SectionCard title="Цели" note="Allowlist">
              <DataTable
                caption="Ключевые цели Метрики"
                columns={["Цель", "Категория", "Достижения", "Конверсия"]}
                rows={metrica.goals.map((goal) => ({
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
          </div>

          <SectionCard title="Методология" note="Источники подписаны">
            <ul className="space-y-2 text-sm leading-5 text-[var(--crm-text-secondary)]">
              {snapshot.combined.methodology.map((item) => (
                <li key={item} className="rounded-xl bg-[var(--crm-surface-muted)] px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
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
          mode === "live" ? (
            <span className="rounded-xl border border-[var(--crm-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--crm-text-secondary)] shadow-sm">
              {periodLabel}
            </span>
          ) : undefined
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
