"use client";

import { ArrowUpRight, Check, Loader2, Phone, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { sendLead } from "../../shared/leads/send-lead.ts";

type SubmitState = "idle" | "loading" | "success" | "error";

type FormErrors = {
  name?: string;
  phone?: string;
  consent?: string;
};

function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) return `7${digits.slice(1)}`.slice(0, 11);
  if (digits.startsWith("7")) return digits.slice(0, 11);
  return `7${digits}`.slice(0, 11);
}

function formatPhone(value: string) {
  const digits = normalizePhoneDigits(value);
  if (digits.length <= 1) return value.replace(/\D/g, "").length === 0 ? "" : "+7";

  const body = digits.slice(1);
  const part1 = body.slice(0, 3);
  const part2 = body.slice(3, 6);
  const part3 = body.slice(6, 8);
  const part4 = body.slice(8, 10);
  let result = "+7";

  if (part1) result += ` (${part1}`;
  if (part1.length === 3) result += ")";
  if (part2) result += ` ${part2}`;
  if (part3) result += `-${part3}`;
  if (part4) result += `-${part4}`;
  return result;
}

function getUtmPayload() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content: params.get("utm_content") || undefined,
    utm_term: params.get("utm_term") || undefined,
  };
}

export function LeadRequestDialog() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [openedAt, setOpenedAt] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  function getDialog() {
    return document.getElementById("impulse-lead-dialog") as HTMLDialogElement | null;
  }

  function openDialog() {
    setName("");
    setPhone("");
    setConsent(false);
    setHoneypot("");
    setOpenedAt(Date.now());
    setSubmitState("idle");
    setSubmitError("");
    setErrors({});
    const dialog = getDialog();
    if (!dialog?.open) dialog?.showModal();
  }

  function closeDialog() {
    if (submitState !== "loading") getDialog()?.close();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phoneDigits = normalizePhoneDigits(phone);
    const nextErrors: FormErrors = {};

    if (name.trim().length < 2) nextErrors.name = "Введите имя.";
    if (phoneDigits.length !== 11) nextErrors.phone = "Введите телефон в формате +7 (999) 999-99-99.";
    if (!consent) nextErrors.consent = "Подтвердите согласие на обработку персональных данных.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitState("loading");
    setSubmitError("");

    try {
      await sendLead({
        name: name.trim(),
        phone: `+${phoneDigits}`,
        source: window.location.href,
        honeypot,
        openedAt,
        utm: getUtmPayload(),
      });
      setSubmitState("success");
    } catch (error) {
      setSubmitState("error");
      setSubmitError(error instanceof Error ? error.message : "Не удалось отправить заявку.");
    }
  }

  return (
    <>
      <button
        type="button"
        className="group inline-flex min-h-12 items-center gap-3 bg-[var(--ch-accent)] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--ch-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ch-bg-deepest)]"
        onClick={openDialog}
      >
        Бесплатный тест-драйв
        <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.8} aria-hidden />
      </button>

      <dialog
        id="impulse-lead-dialog"
        className="impulse-login-dialog m-auto w-[min(576px,calc(100%_-_32px))] border border-white/12 bg-[var(--ch-bg-deeper)] p-0 text-white shadow-[0_32px_100px_rgba(0,0,0,0.55)] backdrop:bg-[#05080c]/78 backdrop:backdrop-blur-sm"
        aria-labelledby="lead-dialog-title"
        onCancel={(event) => {
          if (submitState === "loading") event.preventDefault();
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
            aria-label="Закрыть форму заявки"
          >
            <X className="size-5" strokeWidth={1.6} aria-hidden />
          </button>

          {submitState === "success" ? (
            <div className="py-8 pr-10">
              <span className="grid size-12 place-items-center bg-[var(--ch-accent)] text-white">
                <Check className="size-6" strokeWidth={1.8} aria-hidden />
              </span>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ch-accent)]">AMS IMPULSE</p>
              <h2 id="lead-dialog-title" className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-white">Заявка отправлена</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ch-muted-ondark)]">Свяжемся с вами, уточним задачу и обсудим следующий шаг.</p>
              <button type="button" className="mt-7 min-h-12 bg-white px-6 text-sm font-bold text-[var(--ch-bg-deeper)]" onClick={closeDialog}>Закрыть</button>
            </div>
          ) : (
            <>
              <div className="pr-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ch-accent)]">
                  AMS IMPULSE
                </p>
                <h2 id="lead-dialog-title" className="mt-4 text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-white sm:text-[34px]">
                  Запустить бесплатный тест-драйв
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-[var(--ch-muted-ondark)]">
                  Оставьте имя и телефон. Уточним задачу и запустим пробный период.
                </p>
              </div>

              <form className="mt-8 border-t border-white/10 pt-8" onSubmit={handleSubmit} noValidate>
                <div className="space-y-6">
                  <label className="block">
                    <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">
                      Имя
                    </span>
                    <span className="group relative flex min-h-14 items-center border border-white/14 bg-[#151e29]/72 transition duration-200 focus-within:border-[var(--ch-accent)] focus-within:bg-[#182331] focus-within:shadow-[0_0_0_3px_rgba(95,127,174,0.16)]">
                      <UserRound
                        className="pointer-events-none absolute left-4 size-[18px] text-white/34 transition group-focus-within:text-[var(--ch-accent)]"
                        strokeWidth={1.6}
                        aria-hidden
                      />
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                        }}
                        className="min-h-14 w-full bg-transparent py-3 pl-12 pr-4 text-base font-medium text-white outline-none placeholder:text-white/24 focus-visible:outline-none"
                        autoComplete="name"
                        autoFocus
                        aria-invalid={Boolean(errors.name)}
                      />
                    </span>
                    {errors.name ? <span className="mt-2 block text-xs text-rose-200">{errors.name}</span> : null}
                  </label>

                  <label className="block">
                    <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">
                      Телефон
                    </span>
                    <span className="group relative flex min-h-14 items-center border border-white/14 bg-[#151e29]/72 transition duration-200 focus-within:border-[var(--ch-accent)] focus-within:bg-[#182331] focus-within:shadow-[0_0_0_3px_rgba(95,127,174,0.16)]">
                      <Phone
                        className="pointer-events-none absolute left-4 size-[18px] text-white/34 transition group-focus-within:text-[var(--ch-accent)]"
                        strokeWidth={1.6}
                        aria-hidden
                      />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => {
                          setPhone(formatPhone(event.target.value));
                          if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }));
                        }}
                        className="min-h-14 w-full bg-transparent py-3 pl-12 pr-4 text-base font-medium text-white outline-none placeholder:text-white/24 focus-visible:outline-none"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="+7 (999) 999-99-99"
                        aria-invalid={Boolean(errors.phone)}
                      />
                    </span>
                    {errors.phone ? <span className="mt-2 block text-xs text-rose-200">{errors.phone}</span> : null}
                  </label>
                </div>

                <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
                  <label>
                    Компания
                    <input type="text" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" />
                  </label>
                </div>

                <div className="mt-6 flex items-start gap-3">
                  <label className="relative mt-0.5 grid size-5 shrink-0 cursor-pointer place-items-center" aria-label="Даю согласие на обработку персональных данных">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => {
                        setConsent(event.target.checked);
                        if (errors.consent) setErrors((current) => ({ ...current, consent: undefined }));
                      }}
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 border border-white/24 bg-white/[0.04] transition peer-checked:border-[var(--ch-accent)] peer-checked:bg-[var(--ch-accent)] peer-focus-visible:shadow-[0_0_0_3px_rgba(95,127,174,0.2)]" />
                    <Check className="relative size-3.5 text-white opacity-0 transition peer-checked:opacity-100" strokeWidth={2.2} aria-hidden />
                  </label>
                  <p className="text-xs leading-5 text-white/52">
                    Даю согласие на{" "}
                    <Link href="/politika/" className="font-semibold text-white/82 underline decoration-[var(--ch-accent)]/70 underline-offset-3 transition hover:text-white">
                      обработку персональных данных
                    </Link>
                  </p>
                </div>
                {errors.consent ? <p className="mt-2 text-xs text-rose-200">{errors.consent}</p> : null}

                {submitState === "error" ? (
                  <p className="mt-6 border border-rose-300/20 bg-rose-950/25 px-4 py-3 text-sm leading-5 text-rose-100" role="alert">
                    {submitError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitState === "loading"}
                  className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2.5 bg-[var(--ch-accent)] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--ch-accent-hover)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ch-bg-deeper)]"
                >
                  {submitState === "loading" ? <Loader2 className="size-4 animate-spin" strokeWidth={1.7} aria-hidden /> : null}
                  {submitState === "loading" ? "Отправляем…" : "Запустить тест-драйв"}
                </button>
              </form>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
