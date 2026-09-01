import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Демонстрационный отчёт",
  robots: { index: false, follow: false, nocache: true },
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return children;
}
