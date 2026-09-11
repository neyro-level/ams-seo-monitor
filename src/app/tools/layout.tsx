import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PrivateApplicationLayout } from "../../components/shell/PrivateApplicationLayout.tsx";

export const metadata: Metadata = {
  title: "Инструменты",
  robots: { index: false, follow: false, nocache: true },
};

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return <PrivateApplicationLayout>{children}</PrivateApplicationLayout>;
}
