"use client";

import { ArrowUpRight, Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { sendLead } from "../../shared/leads/send-lead";

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
        Обсудить проект
        <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.8} aria-hidden />
      </button>

      <dialog
        id="impulse-lead-dialog"
        className="impulse-login-dialog m-auto w-[min(480px,calc(100%_-_32px))] border border-white/12 bg-[var(--ch-bg-deeper)] p-0 text-white shadow-[0_32px_100px_rgba(0,0,0,0.55)] backdrop:bg-[#05080c]/78 backdrop:backdrop-blur-sm"
        aria-labelledby="lead-dialog-title"
        onCancel={(event) => {
          if (submitState === "loading") event.preventDefault();
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
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ch-accent)]">AMS IMPULSE</p>
                <h2 id="lead-dialog-title" className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-white">Обсудить проект</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--ch-muted-ondark)]">Оставьте имя и телефон. Уточним задачу и предложим реалистичный сценарий продвижения.</p>
              </div>

              <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/62">Имя</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                    }}
                    className="min-h-12 w-full border border-white/14 bg-white/[0.055] px-4 text-base text-white outline-none transition focus:border-[var(--ch-accent)] focus:ring-2 focus:ring-[var(--ch-accent)]/25"
                    autoComplete="name"
                    autoFocus
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name ? <span className="text-xs text-rose-200">{errors.name}</span> : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/62">Телефон</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(formatPhone(event.target.value));
                      if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }));
                    }}
                    className="min-h-12 w-full border border-white/14 bg-white/[0.055] px-4 text-base text-white outline-none transition focus:border-[var(--ch-accent)] focus:ring-2 focus:ring-[var(--ch-accent)]/25"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+7 (999) 999-99-99"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone ? <span className="text-xs text-rose-200">{errors.phone}</span> : null}
                </label>

                <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
                  <label>
                    Компания
                    <input type="text" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" />
                  </label>
                </div>

                <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-white/55">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => {
                      setConsent(event.target.checked);
                      if (errors.consent) setErrors((current) => ({ ...current, consent: undefined }));
                    }}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--ch-accent)]"
                  />
                  <span>
                    Согласен с <a href="/politika/" className="text-white underline decoration-white/30 underline-offset-2">политикой конфиденциальности</a> и даю <a href="/soglasie/" className="text-white underline decoration-white/30 underline-offset-2">согласие на обработку данных</a>.
                  </span>
                </label>
                {errors.consent ? <p className="text-xs text-rose-200">{errors.consent}</p> : null}

                {submitState === "error" ? (
                  <p className="border border-rose-300/20 bg-rose-950/25 px-4 py-3 text-sm leading-5 text-rose-100" role="alert">{submitError}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitState === "loading"}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[var(--ch-accent)] px-5 text-sm font-bold text-white transition hover:bg-[var(--ch-accent-hover)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ch-bg-deeper)]"
                >
                  {submitState === "loading" ? <Loader2 className="size-4 animate-spin" strokeWidth={1.7} aria-hidden /> : null}
                  {submitState === "loading" ? "Отправляем…" : "Обсудить проект"}
                </button>
              </form>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
