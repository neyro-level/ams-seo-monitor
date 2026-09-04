import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Настройка доступа",
  robots: { index: false, follow: false, nocache: true },
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}
