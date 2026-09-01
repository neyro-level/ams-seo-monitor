"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { NavigationSection } from "../../modules/access/navigation";
import { ShellNav } from "./ShellNav";

type MobileDrawerProps = {
  sections: NavigationSection[];
};

export function MobileDrawer({ sections }: MobileDrawerProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
        aria-expanded={open}
        aria-controls="mobile-report-nav"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" strokeWidth={1.8} />
        <span className="sr-only">Открыть навигацию</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden">
          <div
            id="mobile-report-nav"
            className="h-full w-[min(86vw,320px)] overflow-y-auto bg-[var(--crm-sidebar)] p-3 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Навигация по отчётам"
          >
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-white">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">АМС</p>
                <p className="text-sm font-semibold">IMPULSE</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/7 text-white"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" strokeWidth={1.8} />
                <span className="sr-only">Закрыть навигацию</span>
              </button>
            </div>
            <ShellNav sections={sections} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
