export default function ProjectsLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Загрузка проектов">
      <div className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </main>
  );
}
