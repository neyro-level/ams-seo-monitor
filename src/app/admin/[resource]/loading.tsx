export default function AdminResourceLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Загрузка раздела администрирования">
      <div className="space-y-3">
        <div className="h-8 w-52 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-80 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" key={index} />
        ))}
      </div>
      <div className="h-14 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </main>
  );
}
