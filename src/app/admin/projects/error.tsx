"use client";

import { Button } from "../../../components/ui/button.tsx";

export default function ProjectsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
        <h1 className="text-xl font-semibold text-slate-950">Не удалось загрузить проекты</h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">Повторите запрос. Если ошибка сохранится, передайте оператору время возникновения.</p>
        <Button className="mt-4" onClick={reset} type="button">Повторить</Button>
      </div>
    </main>
  );
}
