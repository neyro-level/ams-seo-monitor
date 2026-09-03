"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../platform/auth/client.ts";
import { completePasswordOnboardingAction } from "./actions.ts";

export function PasswordOnboardingForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setMessage("Не удалось изменить пароль. Проверьте текущий пароль и требования к новому.");
        return;
      }
      const completion = await completePasswordOnboardingAction({});
      if (!completion.ok) {
        setMessage(completion.message);
        return;
      }
      router.replace(completion.data.next);
      router.refresh();
    } catch {
      setMessage("Не удалось изменить пароль. Повторите попытку.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block text-sm font-medium text-slate-800">
        Текущий временный пароль
        <input
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Новый пароль
        <input
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {message ? <p className="text-sm font-medium text-rose-700" role="alert">{message}</p> : null}
      <button className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">
        {pending ? "Сохраняем…" : "Изменить пароль"}
      </button>
    </form>
  );
}
