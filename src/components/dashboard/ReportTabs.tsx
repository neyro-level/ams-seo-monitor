"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

type ReportTab = "summary" | "seo" | "traffic";

type ReportTabsProps = {
  summary: ReactNode;
  seo: ReactNode;
  traffic: ReactNode;
};

const tabs: Array<{ key: ReportTab; label: string }> = [
  { key: "summary", label: "Сводка" },
  { key: "seo", label: "SEO" },
  { key: "traffic", label: "Трафик" },
];

function parseReportTab(hash: string): ReportTab {
  const requestedTab = hash.replace(/^#/, "");
  return requestedTab === "seo" || requestedTab === "traffic" ? requestedTab : "summary";
}

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function ReportTabs({ summary, seo, traffic }: ReportTabsProps) {
  const activeTab = useSyncExternalStore<ReportTab>(
    subscribeToHash,
    () => parseReportTab(window.location.hash),
    () => "summary",
  );

  const panels: Record<ReportTab, ReactNode> = {
    summary,
    seo,
    traffic,
  };

  return (
    <div>
      <div
        className="mb-6 inline-flex max-w-full overflow-x-auto rounded-xl border border-[var(--crm-border)] bg-white p-1 shadow-sm"
        role="tablist"
        aria-label="Разделы отчёта"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`report-tab-${tab.key}`}
              aria-controls={`report-panel-${tab.key}`}
              aria-selected={active}
              className={[
                "inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-semibold transition",
                active
                  ? "bg-[var(--crm-primary)] text-white"
                  : "text-[var(--crm-text-secondary)] hover:bg-slate-100",
              ].join(" ")}
              onClick={() => {
                window.history.replaceState(null, "", `#${tab.key}`);
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section
        id={`report-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`report-tab-${activeTab}`}
      >
        {panels[activeTab]}
      </section>
    </div>
  );
}
