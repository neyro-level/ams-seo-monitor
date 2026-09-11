"use client";

import { Check, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/platform/auth/client";

export function ConsentClient() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scopes = (searchParams.get("scope") ?? "").split(" ").filter(Boolean);

  async function decide(accept: boolean) {
    setPending(true); setError(null);
    try {
      const result = await authClient.oauth2.consent({ accept, scope: accept ? scopes.join(" ") : undefined });
      if (result.error) setError("Не удалось завершить подключение.");
    } catch {
      setError("Не удалось завершить подключение.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="theme-app grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md border border-border bg-card p-6 shadow-sm sm:p-8" aria-labelledby="consent-title">
        <p className="text-xs font-semibold uppercase text-muted-foreground">AMS IMPULSE</p>
        <h1 id="consent-title" className="mt-2 text-2xl font-bold">Подключение к исследованиям</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Приложение запрашивает работу с исследованиями только в тех проектах, к которым у вашей учётной записи уже есть доступ.</p>
        <div className="mt-6 border-y border-border py-4 text-sm">
          <p className="font-medium">Разрешение</p>
          <p className="mt-1 text-muted-foreground">Создание, запуск, просмотр и экспорт исследований через MCP.</p>
        </div>
        {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" disabled={pending} onClick={() => decide(false)}><X aria-hidden />Отклонить</Button>
          <Button type="button" disabled={pending} onClick={() => decide(true)}><Check aria-hidden />Разрешить</Button>
        </div>
      </section>
    </main>
  );
}
