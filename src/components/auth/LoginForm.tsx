"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "../../infrastructure/auth/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setErrorMessage(null);

        const result = await authClient.signIn.email({
          email,
          password,
          rememberMe: true,
        });

        if (result.error) {
          setErrorMessage("Не удалось войти. Проверьте email и пароль.");
          setPending(false);
          return;
        }

        router.replace("/");
        router.refresh();
      }}
    >
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--crm-text)]">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-[var(--crm-border-strong)] bg-white px-4 py-3 text-[var(--crm-text)]"
          autoComplete="email"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--crm-text)]">Пароль</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-[var(--crm-border-strong)] bg-white px-4 py-3 text-[var(--crm-text)]"
          autoComplete="current-password"
          required
        />
      </label>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-xl bg-[var(--crm-primary)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
