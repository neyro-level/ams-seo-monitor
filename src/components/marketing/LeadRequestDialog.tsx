"use client";

import { ArrowUpRight, Check, Loader2, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../ui/button.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [openedAt, setOpenedAt] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  function openDialog() {
    setName("");
    setPhone("");
    setConsent(false);
    setHoneypot("");
    setOpenedAt(Date.now());
    setSubmitState("idle");
    setSubmitError("");
    setErrors({});
    setOpen(true);
  }

  function closeDialog() {
    if (submitState !== "loading") setOpen(false);
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
      <Button type="button" variant="marketing" size="lg" className="group gap-3" onClick={openDialog}>
        Бесплатный тест-драйв
        <ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.8} aria-hidden />
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}>
        <DialogContent
          className="impulse-landing w-[min(576px,calc(100%_-_32px))] rounded-none border-white/12 bg-[var(--ch-bg-deeper)] p-7 text-white shadow-[0_32px_100px_rgba(0,0,0,0.55)] sm:p-10"
          showCloseButton={submitState !== "loading"}
        >
          {submitState === "success" ? (
            <div className="py-8 pr-10">
              <span className="grid size-12 place-items-center bg-[var(--ch-accent)] text-white"><Check className="size-6" strokeWidth={1.8} aria-hidden /></span>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ch-accent)]">AMS IMPULSE</p>
              <DialogTitle className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-white">Заявка отправлена</DialogTitle>
              <p className="mt-3 text-sm leading-6 text-[var(--ch-muted-ondark)]">Свяжемся с вами, уточним задачу и обсудим следующий шаг.</p>
              <Button type="button" variant="secondary" size="lg" className="mt-7 rounded-none bg-white text-[var(--ch-bg-deeper)] hover:bg-white/90" onClick={closeDialog}>Закрыть</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ch-accent)]">AMS IMPULSE</p>
                <DialogTitle className="mt-2 text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-white sm:text-[34px]">Запустить бесплатный тест-драйв</DialogTitle>
                <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ch-muted-ondark)]">Оставьте имя и телефон. Уточним задачу и запустим пробный период.</p>
              </DialogHeader>

              <form className="mt-8 border-t border-white/10 pt-8" onSubmit={handleSubmit} noValidate>
                <div className="space-y-6">
                  <label className="block">
                    <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">Имя</span>
                    <span className="group relative flex min-h-14 items-center">
                      <UserRound className="pointer-events-none absolute left-4 z-10 size-[18px] text-white/34 group-focus-within:text-[var(--ch-accent)]" strokeWidth={1.6} aria-hidden />
                      <Input type="text" value={name} onChange={(event) => { setName(event.target.value); if (errors.name) setErrors((current) => ({ ...current, name: undefined })); }} className="min-h-14 rounded-none border-white/14 bg-[#151e29]/72 py-3 pl-12 pr-4 text-base font-medium text-white placeholder:text-white/24 focus-visible:border-[var(--ch-accent)]" autoComplete="name" autoFocus aria-invalid={Boolean(errors.name)} />
                    </span>
                    {errors.name ? <span className="mt-2 block text-xs text-rose-200">{errors.name}</span> : null}
                  </label>

                  <label className="block">
                    <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">Телефон</span>
                    <span className="group relative flex min-h-14 items-center">
                      <Phone className="pointer-events-none absolute left-4 z-10 size-[18px] text-white/34 group-focus-within:text-[var(--ch-accent)]" strokeWidth={1.6} aria-hidden />
                      <Input type="tel" value={phone} onChange={(event) => { setPhone(formatPhone(event.target.value)); if (errors.phone) setErrors((current) => ({ ...current, phone: undefined })); }} className="min-h-14 rounded-none border-white/14 bg-[#151e29]/72 py-3 pl-12 pr-4 text-base font-medium text-white placeholder:text-white/24 focus-visible:border-[var(--ch-accent)]" autoComplete="tel" inputMode="tel" placeholder="+7 (999) 999-99-99" aria-invalid={Boolean(errors.phone)} />
                    </span>
                    {errors.phone ? <span className="mt-2 block text-xs text-rose-200">{errors.phone}</span> : null}
                  </label>
                </div>

                <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
                  <label>Компания<Input type="text" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
                </div>

                <div className="mt-6 flex items-start gap-3">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={(checked) => {
                      setConsent(checked);
                      if (errors.consent) setErrors((current) => ({ ...current, consent: undefined }));
                    }}
                    className="mt-0.5 rounded-none border-white/24 bg-white/[0.04] data-checked:border-[var(--ch-accent)] data-checked:bg-[var(--ch-accent)]"
                    aria-label="Даю согласие на обработку персональных данных"
                  />
                  <p className="text-xs leading-5 text-white/52">Даю согласие на{" "}<Link href="/politika/" className="font-semibold text-white/82 underline decoration-[var(--ch-accent)]/70 underline-offset-3 transition hover:text-white">обработку персональных данных</Link></p>
                </div>
                {errors.consent ? <p className="mt-2 text-xs text-rose-200">{errors.consent}</p> : null}

                {submitState === "error" ? <p className="mt-6 border border-rose-300/20 bg-rose-950/25 px-4 py-3 text-sm leading-5 text-rose-100" role="alert">{submitError}</p> : null}

                <Button type="submit" variant="marketing" size="lg" disabled={submitState === "loading"} className="mt-7 min-h-14 w-full focus-visible:ring-white focus-visible:ring-offset-[var(--ch-bg-deeper)]">
                  {submitState === "loading" ? <Loader2 className="animate-spin" strokeWidth={1.7} aria-hidden /> : null}
                  {submitState === "loading" ? "Отправляем…" : "Запустить тест-драйв"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
