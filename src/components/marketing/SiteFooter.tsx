import { ArrowUpRight, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { legalLinks, legalOperator, publicContacts } from "../../shared/legal/legal-config";

export function SiteFooter() {
  const phoneHref = `tel:${legalOperator.phone.replace(/[^\d+]/g, "")}`;

  return (
    <footer id="site-footer" className="impulse-landing border-t border-white/8 bg-[var(--ch-bg-deeper)] text-white" role="contentinfo">
      <div className="mx-auto grid w-full max-w-[1360px] gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.15fr_0.85fr_0.8fr] lg:gap-16 lg:py-18">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label="AMS IMPULSE — на главную">
            <span className="grid size-10 place-items-center border border-white/14 bg-white/[0.05] text-[11px] font-extrabold">AMS</span>
            <span className="text-sm font-extrabold tracking-[0.16em]">IMPULSE</span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/52">
            Продвижение сайтов в Яндексе через поведенческие факторы с контролем динамики и понятной отчётностью.
          </p>
        </div>

        <nav aria-label="Правовая информация">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ch-accent)]">Документы</h2>
          <div className="mt-5 grid gap-3">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="w-fit text-sm text-white/62 transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <address className="not-italic">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ch-accent)]">Контакты</h2>
          <div className="mt-5 grid gap-3">
            <a href={phoneHref} className="w-fit text-sm font-semibold text-white transition hover:text-[var(--ch-soft-white)]">{legalOperator.phone}</a>
            <a href={`mailto:${legalOperator.email}`} className="w-fit text-sm text-white/62 transition hover:text-white">{legalOperator.email}</a>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={publicContacts.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 border border-white/10 px-3 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white">
              <Send className="size-4" strokeWidth={1.6} aria-hidden /> Telegram
            </a>
            <a href={publicContacts.max} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 border border-white/10 px-3 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white">
              <MessageCircle className="size-4" strokeWidth={1.6} aria-hidden /> Max
            </a>
          </div>
        </address>
      </div>

      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-3 border-t border-white/8 px-5 py-6 text-xs text-white/38 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} {legalOperator.name} · ИНН {legalOperator.inn}</p>
        <a href="https://ams24.ru" target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1.5 transition hover:text-white/70">
          Разработано в АМС <ArrowUpRight className="size-3.5" strokeWidth={1.6} aria-hidden />
        </a>
      </div>
    </footer>
  );
}
