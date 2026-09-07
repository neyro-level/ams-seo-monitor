"use client";

import { Button } from "../../../components/ui/button.tsx";
import { ErrorState } from "../../../components/states/StatePanel.tsx";

export default function ProjectsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <ErrorState title="Не удалось загрузить проекты" description="Повторите запрос. Если ошибка сохранится, передайте оператору время возникновения." action={<Button onClick={reset} type="button">Повторить</Button>} />
    </main>
  );
}
