"use client";

import { ErrorState } from "../../../components/states/StatePanel.tsx";
import { Button } from "../../../components/ui/button.tsx";

export default function ResearchError({ reset }: { reset: () => void }) {
  return <ErrorState title="Не удалось открыть исследования" description="Данные не изменены. Повторите запрос или вернитесь к нему позже." action={<Button type="button" variant="outline" onClick={reset}>Повторить</Button>} />;
}
