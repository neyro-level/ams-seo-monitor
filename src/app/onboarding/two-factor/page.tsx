import { redirect } from "next/navigation";
import { getCurrentPrincipalState } from "../../../platform/auth/principal-session.ts";
import { TwoFactorEnrollmentForm } from "./TwoFactorEnrollmentForm.tsx";

export const dynamic = "force-dynamic";

export default async function TwoFactorOnboardingPage() {
  const state = await getCurrentPrincipalState();
  if (!state) redirect("/?login=1");
  if (state.principal.kind !== "platform-admin") redirect("/dashboard/");
  if (state.mustChangePassword) redirect("/onboarding/password/");
  if (state.twoFactorEnabled) redirect("/dashboard/");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Защита Platform Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Настройте двухфакторную защиту</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Доступ к административному контуру будет открыт после подтверждения TOTP-кода.</p>
        <div className="mt-6"><TwoFactorEnrollmentForm /></div>
      </section>
    </main>
  );
}
