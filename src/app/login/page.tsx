import { redirect } from "next/navigation";
import { LoginForm } from "../../components/auth/LoginForm";
import { getCurrentAuthenticatedUser } from "../../infrastructure/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentAuthenticatedUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[var(--crm-page)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-[var(--crm-border)] bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--crm-text-muted)]">
            AMS SEO Monitor
          </p>
          <h1 className="text-2xl font-semibold text-[var(--crm-text)]">Вход в кабинет</h1>
          <p className="text-sm text-[var(--crm-text-secondary)]">
            Email/password вход через Better Auth. Публичная регистрация отключена.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
