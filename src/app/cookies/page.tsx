import type { Metadata } from "next";
import { LegalDocument } from "../../components/marketing/LegalDocument";
import { CookiesContent } from "../../components/marketing/legal/LegalContents";

export const metadata: Metadata = {
  title: "Правила использования Cookie — AMS IMPULSE",
  description: "Правила использования файлов cookie и аналогичных технологий на сайте AMS IMPULSE.",
};

export default function CookiesPage() {
  return (
    <LegalDocument
      eyebrow="Cookie и аналитика"
      title="Правила использования файлов cookie"
      description="Определяют порядок применения файлов cookie и аналогичных технологий на сайте."
      version="Версия 1.0"
      effectiveDate="24.05.2026"
    >
      <CookiesContent />
    </LegalDocument>
  );
}
