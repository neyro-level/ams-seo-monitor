import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  note?: string;
  children: ReactNode;
};

export function SectionCard({ title, note, children }: SectionCardProps) {
  return (
    <section className="rounded-[8px] border border-[var(--report-border)] bg-white p-4 sm:p-5">
      <header className="mb-4 flex flex-col gap-2 border-b border-[var(--report-border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[18px] font-semibold leading-6 text-[var(--report-text)] sm:text-[22px] sm:leading-7">
          {title}
        </h2>
        {note ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--report-text-muted)]">
            {note}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
