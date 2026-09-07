import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import styles from "./landing.module.css";

const quickLinks = [
  {
    href: "/",
    label: "Главная",
    description: "Вернуться к предложению AMS IMPULSE.",
  },
  {
    href: "/politika/",
    label: "Конфиденциальность",
    description: "Политика обработки персональных данных.",
  },
  {
    href: "/terms/",
    label: "Условия",
    description: "Общие условия сотрудничества с АМС.",
  },
] as const;

export default function NotFound() {
  return (
    <main className="theme-public impulse-landing relative isolate flex min-h-dvh items-center overflow-hidden bg-[var(--ch-bg-deepest)] px-5 py-14 text-white sm:px-6">
      <div className={`${styles.grid} absolute inset-0 -z-20 opacity-70`} aria-hidden />
      <div className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 select-none text-[clamp(170px,28vw,390px)] font-extrabold leading-none tracking-[-0.08em] text-white/[0.025]" aria-hidden>
        404
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_44%,rgba(95,127,174,0.16),transparent_36%)]" aria-hidden />

      <div className="mx-auto w-full max-w-[980px] text-center">
        <Link href="/" className="mx-auto inline-flex items-center gap-3" aria-label="AMS IMPULSE — на главную">
          <span className="grid size-12 place-items-center border border-white/14 bg-white/[0.05] text-xs font-extrabold">AMS</span>
          <span className="text-sm font-extrabold tracking-[0.16em]">IMPULSE</span>
        </Link>

        <p className="mt-10 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ch-accent)]">
          <span className="h-px w-6 bg-[var(--ch-accent)]/70" aria-hidden />
          Маршрут не найден
          <span className="h-px w-6 bg-[var(--ch-accent)]/70" aria-hidden />
        </p>
        <h1 className="mt-5 text-[clamp(38px,6vw,66px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-white">
          Страница не существует
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
          Возможно, ссылка устарела или адрес введён с ошибкой. Вернитесь на главную или выберите доступный раздел.
        </p>

        <Link href="/" className="mx-auto mt-8 inline-flex min-h-12 items-center gap-2.5 bg-[var(--ch-accent)] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--ch-accent-hover)]">
          <ArrowLeft className="size-4" strokeWidth={1.7} aria-hidden />
          Вернуться на главную
        </Link>

        <nav className="mt-12 grid gap-3 text-left sm:grid-cols-3" aria-label="Доступные разделы">
          {quickLinks.map((item, index) => (
            <Link key={item.href} href={item.href} className="group min-h-36 border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-[var(--ch-accent)]/65 hover:bg-white/[0.06]">
              <span className="text-[10px] font-bold tracking-[0.16em] text-[var(--ch-accent)]">{String(index + 1).padStart(2, "0")}</span>
              <span className="mt-4 flex items-center justify-between gap-3 text-base font-bold text-white">
                {item.label}
                <ArrowUpRight className="size-4 text-white/35 transition group-hover:text-white" strokeWidth={1.6} aria-hidden />
              </span>
              <span className="mt-2 block text-sm leading-5 text-white/45">{item.description}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
