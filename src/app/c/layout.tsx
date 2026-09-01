import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Клиентский кабинет",
  robots: { index: false, follow: false, nocache: true },
};

export default function ClientLayout({ children }: { children: ReactNode }) {
  return children;
}
