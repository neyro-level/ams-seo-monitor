"use client";

import { LockKeyhole, LogIn, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../../components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog.tsx";
import { Input } from "../../../components/ui/input.tsx";
import { authClient } from "../../../platform/auth/client.ts";

type LoginDialogProps = {
  initialOpen?: boolean;
};

export function LoginDialog({ initialOpen = false }: LoginDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginSucceededRef = useRef(false);
  const [pending, setPending] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && pending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setErrorMessage(null);
      if (!loginSucceededRef.current && window.location.search.includes("login=")) {
        window.history.replaceState(null, "", "/");
      }
      loginSucceededRef.current = false;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.username({ username, password, rememberMe: true });
      if (result.error) {
        setErrorMessage("Не удалось войти. Проверьте логин и пароль.");
        return;
      }

      loginSucceededRef.current = true;
      setOpen(false);
      router.replace("/dashboard/");
    } catch {
      setErrorMessage("Не удалось войти. Повторите попытку позже.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="marketingOutline"
        className="group gap-2 px-4"
        onClick={() => {
          setErrorMessage(null);
          setOpen(true);
        }}
      >
        <span className="hidden sm:inline">Вход в личный кабинет</span>
        <span className="sm:hidden">Войти</span>
        <LogIn className="transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} aria-hidden />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="impulse-landing rounded-none border-white/12 bg-[var(--ch-bg-deeper)] p-7 text-white shadow-[0_32px_100px_rgba(0,0,0,0.55)] sm:p-10"
          showCloseButton={!pending}
        >
          <DialogHeader>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ch-accent)]">AMS IMPULSE</p>
            <DialogTitle className="mt-2 text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-white sm:text-[34px]">
              Вход в кабинет
            </DialogTitle>
          </DialogHeader>

          <form className="mt-9 border-t border-white/10 pt-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <label className="block">
                <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">Логин</span>
                <span className="group relative flex min-h-14 items-center">
                  <UserRound className="pointer-events-none absolute left-4 z-10 size-[18px] text-white/34 group-focus-within:text-[var(--ch-accent)]" strokeWidth={1.6} aria-hidden />
                  <Input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="min-h-14 rounded-none border-white/14 bg-[#151e29]/72 py-3 pl-12 pr-4 text-base font-medium text-white placeholder:text-white/24 focus-visible:border-[var(--ch-accent)] focus-visible:ring-[rgba(95,127,174,0.16)]"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">Пароль</span>
                <span className="group relative flex min-h-14 items-center">
                  <LockKeyhole className="pointer-events-none absolute left-4 z-10 size-[18px] text-white/34 group-focus-within:text-[var(--ch-accent)]" strokeWidth={1.6} aria-hidden />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-h-14 rounded-none border-white/14 bg-[#151e29]/72 py-3 pl-12 pr-4 text-base font-medium text-white placeholder:text-white/24 focus-visible:border-[var(--ch-accent)] focus-visible:ring-[rgba(95,127,174,0.16)]"
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

            <Button
              type="submit"
              variant="marketing"
              size="lg"
              disabled={pending}
              className="mt-7 min-h-14 w-full focus-visible:ring-white focus-visible:ring-offset-[var(--ch-bg-deeper)]"
            >
              {pending ? "Входим…" : "Войти"}
              {!pending ? <LogIn strokeWidth={1.7} aria-hidden /> : null}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
