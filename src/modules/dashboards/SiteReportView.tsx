import { DeviceBarChart } from "../../components/charts/DeviceBarChart";
import { MetricTrendChart } from "../../components/charts/MetricTrendChart";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { PageHeader } from "../../components/dashboard/PageHeader";
import { SectionCard } from "../../components/dashboard/SectionCard";
import { StatusBanner } from "../../components/dashboard/StatusBanner";
import { PeriodPresetGroup } from "../../components/filters/PeriodPresetGroup";
import { StatePanel } from "../../components/states/StatePanel";
import { DataTable } from "../../components/tables/DataTable";
import { formatDuration, formatInteger, formatPercent, formatPosition } from "../../shared/format/metrics";
import type { SiteReportSnapshot } from "../../shared/schemas/report";
import type { SiteRegistry } from "../../shared/schemas/registry";

type SiteReportViewProps = {
  clientName: string;
  site: SiteRegistry;
  snapshot: SiteReportSnapshot | null;
  mode: "fixture" | "live";
};

export function SiteReportView({ clientName, site, snapshot, mode }: SiteReportViewProps) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={clientName}
        title={mode === "fixture" ? `${site.name} — демонстрация` : site.name}
        description={
          mode === "fixture"
            ? "Synthetic dataset проверяет структуру, responsive и frozen design system."
            : "Управленческая SEO-сводка по подтверждённым данным Яндекс.Вебмастера и Яндекс.Метрики."
        }
        actions={mode === "live" ? <PeriodPresetGroup /> : undefined}
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Показы в Яндексе" value={formatInteger(snapshot.webmaster?.summary.shows ?? null)} tone="primary" hint="Webmaster synthetic" />
        <KpiCard label="Клики из поиска" value={formatInteger(snapshot.webmaster?.summary.clicks ?? null)} hint="Webmaster synthetic" />
        <KpiCard label="CTR" value={formatPercent(snapshot.webmaster?.summary.ctr ?? null, 2)} hint="Shows → clicks" />
        <KpiCard label="Средняя позиция" value={formatPosition(snapshot.webmaster?.summary.avgPosition ?? null)} hint="Позиция показа" />
        <KpiCard label="Органические визиты" value={formatInteger(snapshot.metrica?.summary.visits ?? null)} tone="soft" hint="Metrica synthetic" />
        <KpiCard label="Посетители" value={formatInteger(snapshot.metrica?.summary.users ?? null)} tone="soft" hint="Metrica synthetic" />
        <KpiCard label="Достижения целей" value={formatInteger(snapshot.metrica?.summary.goalReaches ?? null)} tone="soft" hint="Allowlisted goals" />
        <KpiCard label="Конверсия" value={formatPercent(snapshot.metrica?.summary.conversionRate ?? null)} tone="accent" hint="Visits → goals" />
      </section>

      {snapshot.webmaster ? (
        <MetricTrendChart
          title="Видимость Яндекса"
          subtitle="Показы и клики по synthetic weekly pool."
          data={snapshot.webmaster.visibilityTrend}
          metricLabel="Показы"
          secondaryMetricLabel="Клики"
          tertiaryMetricLabel="Средняя позиция"
        />
      ) : null}

      {snapshot.metrica ? (
        <MetricTrendChart
          title="Органический трафик"
          subtitle="Визиты и goal reaches по Yandex organic synthetic segment."
          data={snapshot.metrica.organicTrend}
          metricLabel="Визиты"
          secondaryMetricLabel="Цели"
          tertiaryMetricLabel="Конверсия"
        />
      ) : null}

      <SectionCard title="Combined funnel" note="Без ложной причинности">
        <div className="grid gap-3 lg:grid-cols-4">
          <KpiCard label="Показы" value={formatInteger(snapshot.combined.funnel.shows)} />
          <KpiCard label="Клики" value={formatInteger(snapshot.combined.funnel.clicks)} />
          <KpiCard label="Визиты" value={formatInteger(snapshot.combined.funnel.visits)} />
          <KpiCard label="Цели" value={formatInteger(snapshot.combined.funnel.goalReaches)} />
        </div>
        <ul className="mt-4 space-y-2 text-sm text-[var(--report-text-secondary)]">
          {snapshot.combined.funnel.caveats.map((caveat) => (
            <li key={caveat} className="rounded-[8px] bg-[var(--report-surface-muted)] px-3 py-2">{caveat}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Возможности" note="Deterministic only">
        <ul className="grid gap-3 lg:grid-cols-3">
          {snapshot.combined.opportunities.map((opportunity) => (
            <li key={opportunity.id} className="rounded-[8px] border border-[var(--report-border)] bg-[var(--report-surface-muted)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--report-text-muted)]">
                {opportunity.source}
              </p>
              <h3 className="mt-2 text-base font-semibold text-[var(--report-text)]">{opportunity.title}</h3>
              <p className="mt-2 text-sm leading-5 text-[var(--report-text-secondary)]">{opportunity.summary}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      {snapshot.webmaster ? (
        <SectionCard title="Запросы" note="Local overflow only">
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
            rows={snapshot.webmaster.queries.map((query) => ({
              key: query.queryId,
              cells: [
                <div key="query" className="min-w-[220px]">
                  <p className="font-semibold text-[var(--report-text)]">{query.query}</p>
                  <p className="mt-1 text-xs text-[var(--report-text-muted)]">ID: {query.queryId}</p>
                </div>,
                query.cluster,
                <span key="shows" className="tabular-nums">{formatInteger(query.shows)}</span>,
                <span key="clicks" className="tabular-nums">{formatInteger(query.clicks)}</span>,
                <span key="ctr" className="tabular-nums">{formatPercent(query.ctr, 2)}</span>,
                <span key="position" className="tabular-nums">{formatPosition(query.avgShowPosition)}</span>,
                query.device,
                query.opportunityType,
              ],
            }))}
          />
        </SectionCard>
      ) : null}

      {snapshot.metrica ? (
        <SectionCard title="Landing pages" note="Synthetic fixture">
          <DataTable
            caption="Landing pages Метрики"
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
            rows={snapshot.metrica.landingPages.map((page) => ({
              key: page.path,
              cells: [
                <div key="path" className="min-w-[180px]">
                  <p className="font-semibold text-[var(--report-text)]">{page.path}</p>
                  <p className="mt-1 text-xs text-[var(--report-text-muted)]">{page.trendLabel}</p>
                </div>,
                <span key="visits" className="tabular-nums">{formatInteger(page.visits)}</span>,
                <span key="users" className="tabular-nums">{formatInteger(page.users)}</span>,
                <span key="views" className="tabular-nums">{formatInteger(page.pageviews)}</span>,
                <span key="bounce" className="tabular-nums">{formatPercent(page.bounceRate)}</span>,
                <span key="depth" className="tabular-nums">{page.depth.toFixed(1)}</span>,
                <span key="duration" className="tabular-nums">{formatDuration(page.durationSeconds)}</span>,
                <span key="goals" className="tabular-nums">{formatInteger(page.goals)}</span>,
                <span key="conversion" className="tabular-nums">{formatPercent(page.conversionRate)}</span>,
              ],
            }))}
          />
        </SectionCard>
      ) : null}

      {snapshot.metrica ? <DeviceBarChart data={snapshot.metrica.devices} /> : null}

      {snapshot.webmaster ? (
        <SectionCard title="Диагностика и sitemap" note="Foundation DTO proof">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <ul className="space-y-3">
              {snapshot.webmaster.diagnostics.map((diagnostic) => (
                <li key={diagnostic.title} className="rounded-[8px] border border-[var(--report-border)] bg-[var(--report-surface-muted)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--report-text-muted)]">
                    {diagnostic.severity}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-[var(--report-text)]">{diagnostic.title}</h3>
                  <p className="mt-2 text-sm leading-5 text-[var(--report-text-secondary)]">{diagnostic.description}</p>
                </li>
              ))}
            </ul>
            <div className="rounded-[8px] border border-[var(--report-border)] bg-[var(--report-surface-muted)] p-4 text-sm text-[var(--report-text-secondary)]">
              <p><span className="font-semibold text-[var(--report-text)]">Sitemap:</span> {snapshot.webmaster.sitemap.url}</p>
              <p className="mt-2"><span className="font-semibold text-[var(--report-text)]">URLs:</span> {formatInteger(snapshot.webmaster.sitemap.urls)}</p>
              <p className="mt-2"><span className="font-semibold text-[var(--report-text)]">Ошибки:</span> {formatInteger(snapshot.webmaster.sitemap.errors)}</p>
              <p className="mt-2"><span className="font-semibold text-[var(--report-text)]">Внешние ссылки:</span> {formatInteger(snapshot.webmaster.links.external)}</p>
              <p className="mt-2"><span className="font-semibold text-[var(--report-text)]">Битые внутренние:</span> {formatInteger(snapshot.webmaster.links.brokenInternal)}</p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Методология" note="Source-labelled">
        <ul className="space-y-2 text-sm leading-5 text-[var(--report-text-secondary)]">
          {snapshot.combined.methodology.map((item) => (
            <li key={item} className="rounded-[8px] bg-[var(--report-surface-muted)] px-3 py-2">{item}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
