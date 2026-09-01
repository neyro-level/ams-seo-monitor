"use client";

import { LogIn, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "../../infrastructure/auth/auth-client";

type LoginDialogProps = {
  initialOpen?: boolean;
};

export function LoginDialog({ initialOpen = false }: LoginDialogProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = document.getElementById("impulse-login-dialog") as HTMLDialogElement | null;
    if (initialOpen && !dialog?.open) {
      dialog?.showModal();
    }
  }, [initialOpen]);

  function openDialog() {
    setErrorMessage(null);
    const dialog = document.getElementById("impulse-login-dialog") as HTMLDialogElement | null;
    if (!dialog?.open) dialog?.showModal();
  }

  function closeDialog() {
    if (!pending) {
      const dialog = document.getElementById("impulse-login-dialog") as HTMLDialogElement | null;
      dialog?.close();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      });

      if (result.error) {
        setErrorMessage("Не удалось войти. Проверьте email и пароль.");
        return;
      }

      const dialog = document.getElementById("impulse-login-dialog") as HTMLDialogElement | null;
      dialog?.close();
      router.replace("/dashboard/");
      router.refresh();
    } catch {
      setErrorMessage("Не удалось войти. Повторите попытку позже.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="group inline-flex min-h-11 items-center gap-2 border border-white/16 bg-white/[0.045] px-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ch-accent)]"
        onClick={openDialog}
      >
        <span className="hidden sm:inline">Вход в личный кабинет</span>
        <span className="sm:hidden">Войти</span>
        <LogIn className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} aria-hidden />
      </button>

      <dialog
        id="impulse-login-dialog"
        className="impulse-login-dialog m-auto w-[min(440px,calc(100%_-_32px))] border border-white/12 bg-[var(--ch-bg-deeper)] p-0 text-white shadow-[0_32px_100px_rgba(0,0,0,0.55)] backdrop:bg-[#05080c]/78 backdrop:backdrop-blur-sm"
        aria-labelledby="login-dialog-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClose={() => {
          setErrorMessage(null);
          if (window.location.search.includes("login=")) {
            window.history.replaceState(null, "", "/");
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            className="absolute right-4 top-4 grid size-11 place-items-center border border-white/10 text-white/65 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ch-accent)]"
            onClick={closeDialog}
            aria-label="Закрыть окно входа"
          >
            <X className="size-5" strokeWidth={1.6} aria-hidden />
          </button>

          <div className="pr-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ch-accent)]">
              AMS IMPULSE
            </p>
            <h2 id="login-dialog-title" className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-white">
              Вход в кабинет
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ch-muted-ondark)]">
              Используйте рабочий email и пароль. Публичная регистрация отключена.
            </p>
          </div>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/62">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-12 w-full border border-white/14 bg-white/[0.055] px-4 text-base text-white outline-none transition placeholder:text-white/28 focus:border-[var(--ch-accent)] focus:ring-2 focus:ring-[var(--ch-accent)]/25"
                autoComplete="email"
                autoFocus
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/62">Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-12 w-full border border-white/14 bg-white/[0.055] px-4 text-base text-white outline-none transition placeholder:text-white/28 focus:border-[var(--ch-accent)] focus:ring-2 focus:ring-[var(--ch-accent)]/25"
                autoComplete="current-password"
                required
              />
            </label>

            {errorMessage ? (
              <p className="border border-rose-300/20 bg-rose-950/25 px-4 py-3 text-sm leading-5 text-rose-100" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[var(--ch-accent)] px-5 text-sm font-bold text-white transition hover:bg-[var(--ch-accent-hover)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ch-bg-deeper)]"
            >
              {pending ? "Входим…" : "Войти"}
              {!pending ? <LogIn className="size-4" strokeWidth={1.7} aria-hidden /> : null}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
