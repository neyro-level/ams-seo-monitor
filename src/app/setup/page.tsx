import type { Metadata } from "next";
import { SetupForm } from "./SetupForm.tsx";

export const metadata: Metadata = {
  title: "Настройка доступа — AMS IMPULSE",
  robots: { index: false, follow: false },
};

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Первый доступ</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Установите пароль</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Ссылка одноразовая. После установки пароля войдите в кабинет; администратору потребуется настроить 2FA.
        </p>
        <div className="mt-6"><SetupForm /></div>
      </section>
    </main>
  );
}
