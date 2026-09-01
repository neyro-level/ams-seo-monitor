import Link from "next/link";
import Image from "next/image";
import { LoginDialog } from "../components/auth/LoginDialog";
import { LeadRequestDialog } from "../components/marketing/LeadRequestDialog";
import { SiteFooter } from "../components/marketing/SiteFooter";

type HomePageProps = {
  searchParams: Promise<{ login?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const loginRequested = params.login === "1";
  return (
    <main className="impulse-landing min-h-screen overflow-hidden bg-[var(--ch-bg-deepest)] text-[var(--ch-white)]">
      <section className="relative isolate min-h-screen overflow-hidden">
        <Image
          src="/images/ams-impulse-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-[68%_center] sm:object-[62%_center] lg:object-center"
        />
        <div
          className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(12,17,23,0.98)_0%,rgba(12,17,23,0.92)_34%,rgba(12,17,23,0.56)_62%,rgba(12,17,23,0.18)_100%)]"
          aria-hidden
        />
        <div className="impulse-grid absolute inset-0 -z-10 opacity-55" aria-hidden />

        <header className="relative z-20 mx-auto flex w-full max-w-[1360px] items-center justify-between px-5 py-5 sm:px-6 lg:py-7">
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

        <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-[1360px] items-center px-5 pb-14 pt-12 sm:px-6 sm:pb-18 sm:pt-16 lg:pb-20 lg:pt-10">
          <div className="relative z-10 max-w-3xl">
            <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ch-accent)]">
              Продвижение сайтов в Яндексе
            </p>

            <h1 className="max-w-[850px] text-[clamp(44px,6.2vw,84px)] font-extrabold leading-[0.98] tracking-[-0.045em] text-white">
              Быстрое продвижение сайтов в SEO
            </h1>

            <p className="mt-7 max-w-2xl text-[clamp(17px,1.45vw,21px)] leading-[1.62] text-[var(--ch-soft-white)]">
              Поведенческие факторы, которые двигают позиции сайта в Яндексе. Ощутимый результат уже в первые 5 дней.
            </p>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <LeadRequestDialog />
              <p className="max-w-64 text-xs leading-5 text-[var(--ch-muted-ondark)]">
                Разберём текущие позиции и определим реалистичный сценарий продвижения.
              </p>
            </div>

            <div className="mt-14 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-5 text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
              <span>Поведенческие факторы</span>
              <span>Яндекс</span>
              <span>Контроль динамики</span>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
