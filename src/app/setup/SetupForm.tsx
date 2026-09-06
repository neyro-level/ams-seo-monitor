"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { completeSetupAction } from "./actions.ts";

export function SetupForm() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const rawToken = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    window.history.replaceState(null, "", "/setup/");
    setToken(rawToken || null);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setMessage("Ссылка настройки отсутствует или недействительна.");
      return;
    }
    if (newPassword !== confirmation) {
      setMessage("Пароли не совпадают.");
      return;
    }

    setPending(true);
    setMessage(null);
    const result = await completeSetupAction({ token, newPassword });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setToken(null);
    setNewPassword("");
    setConfirmation("");
    router.replace("/?login=1&setup=complete");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block text-sm font-medium text-slate-800">
        Новый пароль
        <input
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Повторите пароль
        <input
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3"
          type="password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      {message ? <p className="text-sm font-medium text-rose-700" role="alert">{message}</p> : null}
      <button
        className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={pending || token === null}
        type="submit"
      >
        {pending ? "Сохраняем…" : "Установить пароль"}
      </button>
    </form>
  );
}
