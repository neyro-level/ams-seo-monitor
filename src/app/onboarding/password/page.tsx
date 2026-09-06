import { redirect } from "next/navigation";
import { getCurrentPrincipalState } from "../../../platform/auth/principal-session.ts";
import { PasswordOnboardingForm } from "./PasswordOnboardingForm.tsx";

export const dynamic = "force-dynamic";

export default async function PasswordOnboardingPage() {
  const state = await getCurrentPrincipalState();
  if (!state) redirect("/?login=1");
  if (!state.mustChangePassword) {
    redirect(state.principal.kind === "platform-admin" && !state.twoFactorEnabled ? "/onboarding/two-factor/" : "/dashboard/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Первый вход</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Измените временный пароль</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">До завершения настройки доступ к кабинету ограничен.</p>
        <div className="mt-6"><PasswordOnboardingForm /></div>
      </section>
    </main>
  );
}
