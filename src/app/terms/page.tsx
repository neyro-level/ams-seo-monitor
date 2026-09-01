import type { Metadata } from "next";
import { LegalDocument } from "../../components/marketing/LegalDocument";
import { TermsContent } from "../../components/marketing/legal/LegalContents";

export const metadata: Metadata = {
  title: "Общие условия сотрудничества — AMS IMPULSE",
  description: "Общие условия сотрудничества между АМС и заказчиком.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Юридический документ"
      title="Общие условия сотрудничества"
      description="Базовые правила работы, роли сторон, порядок заключения сделки и границы ответственности."
      version="Редакция 05.02.2026"
      effectiveDate="05.02.2026"
    >
      <TermsContent />
    </LegalDocument>
  );
}
