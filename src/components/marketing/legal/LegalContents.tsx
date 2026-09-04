import { consentHtml, cookiesHtml, privacyHtml, termsHtml } from "./legal-html.ts";

type StaticLegalContentProps = {
  html: string;
};

function StaticLegalContent({ html }: StaticLegalContentProps) {
  return <div className="legal-source-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PrivacyContent() {
  return <StaticLegalContent html={privacyHtml} />;
}

export function ConsentContent() {
  return <StaticLegalContent html={consentHtml} />;
}

export function CookiesContent() {
  return <StaticLegalContent html={cookiesHtml} />;
}

export function TermsContent() {
  return <StaticLegalContent html={termsHtml} />;
}
