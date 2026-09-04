"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../platform/auth/client.ts";

export function TwoFactorEnrollmentForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function beginEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = await authClient.twoFactor.enable({ password, method: "totp" });
      if (result.error || result.data?.method !== "totp") {
        setMessage("Не удалось начать настройку двухфакторной защиты.");
        return;
      }
      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
    } catch {
      setMessage("Не удалось начать настройку двухфакторной защиты.");
    } finally {
      setPending(false);
    }
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setMessage("Код не подтверждён. Проверьте приложение-аутентификатор.");
        return;
      }
      router.replace("/dashboard/");
      router.refresh();
    } catch {
      setMessage("Код не подтверждён. Повторите попытку.");
    } finally {
      setPending(false);
    }
  }

  if (!totpUri) {
    return (
      <form className="space-y-5" onSubmit={beginEnrollment}>
        <label className="block text-sm font-medium text-slate-800">
          Текущий пароль
          <input
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {message ? <p className="text-sm font-medium text-rose-700" role="alert">{message}</p> : null}
        <button className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">
          {pending ? "Создаём ключ…" : "Настроить 2FA"}
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={verifyEnrollment}>
      <p className="text-sm leading-6 text-slate-700">Добавьте этот URI в приложение-аутентификатор. Он показывается только в этом защищённом шаге.</p>
      <code className="block break-all rounded-xl bg-slate-100 p-3 text-xs text-slate-800">{totpUri}</code>
      <p className="text-sm font-medium text-slate-800">Сохраните backup-коды офлайн:</p>
      <ul className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-3 font-mono text-xs text-slate-800">
        {backupCodes.map((backupCode) => <li key={backupCode}>{backupCode}</li>)}
      </ul>
      <label className="block text-sm font-medium text-slate-800">
        Код из приложения
        <input
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3"
          inputMode="numeric"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          required
        />
      </label>
      {message ? <p className="text-sm font-medium text-rose-700" role="alert">{message}</p> : null}
      <button className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">
        {pending ? "Проверяем…" : "Подтвердить 2FA"}
      </button>
    </form>
  );
}
