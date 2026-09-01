import type { Metadata } from "next";
import { LegalDocument } from "../../components/marketing/LegalDocument";
import { PrivacyContent } from "../../components/marketing/legal/LegalContents";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — AMS IMPULSE",
  description: "Политика обработки персональных данных AMS IMPULSE.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Юридический документ"
      title="Политика обработки персональных данных"
      description="Определяет порядок обработки и меры по обеспечению безопасности персональных данных."
      version="Версия 1.0"
      effectiveDate="24.05.2026"
    >
      <PrivacyContent />
    </LegalDocument>
  );
}
