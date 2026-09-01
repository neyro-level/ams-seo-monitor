import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMS IMPULSE",
  description: "Продвижение сайтов в Яндексе с фокусом на поведенческие факторы.",
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
