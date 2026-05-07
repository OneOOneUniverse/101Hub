const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

export default function DealsLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Hero: stats row */}
      <section className="panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-3">
          <Sk className="h-5 w-24 rounded-full" />
          <Sk className="h-9 w-72 sm:h-10" />
          <Sk className="h-4 w-80" />
        </div>
        {/* Stats bar */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/8 p-3">
              <Sk className="h-7 w-14 sm:h-8 sm:w-16" />
              <Sk className="h-3 w-20" />
            </div>
          ))}
        </div>
      </section>

      {/* Reward/claim card */}
      <section className="panel p-5">
        <Sk className="mb-3 h-5 w-40" />
        <Sk className="h-4 w-full rounded-full" />
        <div className="mt-3 flex justify-between">
          <Sk className="h-3 w-16" />
          <Sk className="h-3 w-12" />
        </div>
        <Sk className="mt-4 h-11 w-full rounded-full" />
      </section>

      {/* Game cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-black/[0.07]" />
            <Sk className="h-5 w-3/4" />
            <Sk className="h-3 w-full" />
            <Sk className="h-3 w-5/6" />
            <div className="mt-auto flex items-center gap-2 pt-2">
              <Sk className="h-4 w-12" />
              <Sk className="h-4 w-16" />
            </div>
            <Sk className="h-10 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Special stores carousel */}
      <section className="panel p-5">
        <Sk className="mb-3 h-5 w-36" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 w-48 shrink-0 rounded-xl bg-black/[0.07]" />
          ))}
        </div>
      </section>
    </div>
  );
}
