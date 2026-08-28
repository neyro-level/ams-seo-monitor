import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  note?: string;
  children: ReactNode;
};

export function SectionCard({ title, note, children }: SectionCardProps) {
  return (
    <section className="min-w-0 max-w-full rounded-2xl border border-[var(--crm-border)] bg-white p-4 sm:p-5">
      <header className="mb-4 flex flex-col gap-2 border-b border-[var(--crm-border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-[18px] font-semibold leading-6 text-[var(--crm-text)] sm:text-xl sm:leading-[26px]">
          {title}
        </h2>
        {note ? (
          <p className="text-xs font-medium uppercase text-[var(--crm-text-muted)]">
            {note}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
