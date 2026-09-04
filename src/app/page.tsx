import Link from "next/link";
import { LoginDialog } from "../modules/identity-access/client.ts";
import { LeadRequestDialog } from "../components/marketing/LeadRequestDialog.tsx";
import { SiteFooter } from "../components/marketing/SiteFooter.tsx";

type HomePageProps = {
  searchParams: Promise<{ login?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const loginRequested = params.login === "1";
  return (
    <main className="impulse-landing min-h-screen overflow-hidden bg-[var(--ch-bg-deepest)] text-[var(--ch-white)]">
      <section className="relative isolate min-h-screen">
        <div className="impulse-grid absolute inset-0 -z-20" aria-hidden />
        <div className="impulse-atmosphere absolute inset-0 -z-10" aria-hidden />

        <header className="mx-auto flex w-full max-w-[1360px] items-center justify-between px-5 py-5 sm:px-6 lg:py-7">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ch-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ch-bg-deepest)]"
            aria-label="AMS IMPULSE — главная"
          >
            <span className="grid size-10 place-items-center border border-white/16 bg-white/[0.055] text-[11px] font-extrabold tracking-[-0.04em]">
              AMS
            </span>
            <span className="text-sm font-extrabold tracking-[0.16em]">IMPULSE</span>
          </Link>

          <LoginDialog initialOpen={loginRequested} />
        </header>

        <div className="mx-auto grid w-full max-w-[1360px] gap-12 px-5 pb-12 pt-14 sm:px-6 sm:pt-20 lg:min-h-[calc(100vh-96px)] lg:grid-cols-[minmax(0,7fr)_minmax(360px,5fr)] lg:items-center lg:gap-16 lg:pb-20 lg:pt-10">
          <div className="relative z-10 max-w-3xl">
            <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ch-accent)]">
              Продвижение сайтов в Яндексе
            </p>

            <h1 className="max-w-[850px] text-[clamp(44px,6.2vw,84px)] font-extrabold leading-[0.98] tracking-[-0.045em] text-white">
              Быстрое продвижение сайтов в SEO
            </h1>

            <p className="mt-7 max-w-2xl text-[clamp(17px,1.45vw,21px)] leading-[1.62] text-[var(--ch-soft-white)]">
              Быстрое и безопасное продвижение сайтов в топ-1 выдачи Яндекс с помощью уникальных технологий.
            </p>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <LeadRequestDialog />
              <p className="max-w-[285px] text-xs leading-5 text-[var(--ch-muted-ondark)]">
                Регистрируйся в личном кабинете и получай бесплатный тест-драйв на 5 дней.
              </p>
            </div>

            <div className="mt-14 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-5 text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              <span>Поведенческие факторы</span>
              <span>Яндекс</span>
              <span>Контроль динамики</span>
            </div>
          </div>

          <div className="relative min-h-[420px] lg:min-h-[620px]" aria-hidden>
            <div className="impulse-visual absolute inset-0 overflow-hidden border border-white/10 bg-[#101720]/55">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(95,127,174,0.09),transparent_38%,rgba(95,127,174,0.06))]" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 560 680" fill="none">
                <path d="M-20 586C115 498 178 529 268 403C351 288 406 184 596 106" stroke="rgba(95,127,174,0.62)" strokeWidth="2" />
                <path d="M-15 620C138 535 201 552 302 427C389 319 428 215 602 148" stroke="rgba(248,250,252,0.13)" strokeWidth="1" />
                <path d="M30 552L138 478L219 503L316 353L419 302L532 162" stroke="rgba(248,250,252,0.22)" strokeWidth="1" />
                <circle cx="138" cy="478" r="5" fill="#5F7FAE" />
                <circle cx="219" cy="503" r="4" fill="#CBD5E1" />
                <circle cx="316" cy="353" r="6" fill="#5F7FAE" />
                <circle cx="419" cy="302" r="4" fill="#CBD5E1" />
                <circle cx="532" cy="162" r="7" fill="#5F7FAE" />
              </svg>

              <div className="absolute left-6 top-6 border border-white/10 bg-[#0c1117]/75 px-4 py-3 backdrop-blur-sm sm:left-8 sm:top-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Сигнал роста</p>
                <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-white">+ импульс</p>
              </div>

              <div className="absolute bottom-7 right-6 w-[min(280px,calc(100%_-_48px))] border border-white/10 bg-[#151e29]/88 p-5 backdrop-blur-md sm:bottom-9 sm:right-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Динамика</p>
                    <p className="mt-2 text-lg font-bold text-white">Позиции в Яндексе</p>
                  </div>
                  <span className="size-2 bg-[var(--ch-accent)] shadow-[0_0_0_6px_rgba(95,127,174,0.12)]" />
                </div>
                <div className="mt-5 grid grid-cols-5 items-end gap-2">
                  {[26, 36, 48, 68, 92].map((height, index) => (
                    <span
                      key={height}
                      className="block bg-[var(--ch-accent)]/75"
                      style={{ height, opacity: 0.45 + index * 0.12 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
