"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import type { NavigationSection } from "../../modules/project-registry/presentation.ts";
import { Button } from "../ui/button.tsx";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet.tsx";
import { ShellNav } from "./ShellNav.tsx";

type MobileDrawerProps = {
  sections: NavigationSection[];
  currentPath: string;
};

export function MobileDrawer({ sections, currentPath }: MobileDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-expanded={open}
        aria-controls="mobile-report-nav"
        aria-label="Открыть навигацию"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" strokeWidth={1.8} aria-hidden />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          id="mobile-report-nav"
          className="left-0 top-0 h-dvh w-[min(86vw,320px)] translate-x-0 translate-y-0 rounded-none border-r border-white/10 bg-[var(--sidebar)] p-3 text-white data-ending-style:-translate-x-full data-starting-style:-translate-x-full lg:hidden"
        >
          <SheetHeader className="mb-4 rounded-2xl border border-white/10 bg-white/[0.055] p-3 pr-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">АМС</p>
            <SheetTitle className="text-sm font-semibold text-white">IMPULSE</SheetTitle>
            <SheetDescription className="sr-only">Навигация по отчётам и разделам кабинета</SheetDescription>
          </SheetHeader>
          <ShellNav sections={sections} currentPath={currentPath} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
