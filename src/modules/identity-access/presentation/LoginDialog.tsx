"use client";

import { LockKeyhole, LogIn, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "../infrastructure/auth-client";

type LoginDialogProps = {
  initialOpen?: boolean;
};

export function LoginDialog({ initialOpen = false }: LoginDialogProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginSucceededRef = useRef(false);
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
      const result = await authClient.signIn.username({
        username,
        password,
        rememberMe: true,
      });

      if (result.error) {
        setErrorMessage("Не удалось войти. Проверьте логин и пароль.");
        return;
      }

      loginSucceededRef.current = true;
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
        className="impulse-login-dialog m-auto w-[min(528px,calc(100%_-_32px))] border border-white/12 bg-[var(--ch-bg-deeper)] p-0 text-white shadow-[0_32px_100px_rgba(0,0,0,0.55)] backdrop:bg-[#05080c]/78 backdrop:backdrop-blur-sm"
        aria-labelledby="login-dialog-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClose={() => {
          setErrorMessage(null);
          if (!loginSucceededRef.current && window.location.search.includes("login=")) {
            window.history.replaceState(null, "", "/");
          }
          loginSucceededRef.current = false;
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <div className="relative p-7 sm:p-10">
          <button
            type="button"
            className="absolute right-4 top-4 grid size-11 place-items-center border border-white/10 text-white/65 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ch-accent)]"
            onClick={closeDialog}
            aria-label="Закрыть окно входа"
          >
            <X className="size-5" strokeWidth={1.6} aria-hidden />
          </button>

          <div className="pr-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ch-accent)]">
              AMS IMPULSE
            </p>
            <h2 id="login-dialog-title" className="mt-4 text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-white sm:text-[34px]">
              Вход в кабинет
            </h2>
          </div>

          <form className="mt-9 border-t border-white/10 pt-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <label className="block">
                <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">
                  Логин
                </span>
                <span className="group relative flex min-h-14 items-center border border-white/14 bg-[#151e29]/72 transition duration-200 focus-within:border-[var(--ch-accent)] focus-within:bg-[#182331] focus-within:shadow-[0_0_0_3px_rgba(95,127,174,0.16)]">
                  <UserRound
                    className="pointer-events-none absolute left-4 size-[18px] text-white/34 transition group-focus-within:text-[var(--ch-accent)]"
                    strokeWidth={1.6}
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="min-h-14 w-full bg-transparent py-3 pl-12 pr-4 text-base font-medium text-white outline-none placeholder:text-white/24 focus-visible:outline-none"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">
                  Пароль
                </span>
                <span className="group relative flex min-h-14 items-center border border-white/14 bg-[#151e29]/72 transition duration-200 focus-within:border-[var(--ch-accent)] focus-within:bg-[#182331] focus-within:shadow-[0_0_0_3px_rgba(95,127,174,0.16)]">
                  <LockKeyhole
                    className="pointer-events-none absolute left-4 size-[18px] text-white/34 transition group-focus-within:text-[var(--ch-accent)]"
                    strokeWidth={1.6}
                    aria-hidden
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-h-14 w-full bg-transparent py-3 pl-12 pr-4 text-base font-medium text-white outline-none placeholder:text-white/24 focus-visible:outline-none"
                    autoComplete="current-password"
                    required
                  />
                </span>
              </label>
            </div>

            {errorMessage ? (
              <p className="mt-6 border border-rose-300/20 bg-rose-950/25 px-4 py-3 text-sm leading-5 text-rose-100" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2.5 bg-[var(--ch-accent)] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--ch-accent-hover)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ch-bg-deeper)]"
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
