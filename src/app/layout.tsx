import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMS SEO Monitor",
  description: "Private static SEO reporting dashboard foundation for AMS clients.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
