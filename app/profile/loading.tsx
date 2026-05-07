const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

export default function ProfileLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <section className="panel p-6">
        {/* Badge + title */}
        <Sk className="mb-3 h-5 w-24 rounded-full" />
        <Sk className="h-8 w-48" />
        <Sk className="mt-1.5 h-4 w-72" />

        {/* Identity row */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-24 w-24 shrink-0 rounded-full bg-black/[0.07]" />
          <div className="flex flex-col gap-2">
            <Sk className="h-5 w-40" />
            <Sk className="h-4 w-56" />
            <Sk className="h-3 w-32" />
          </div>
        </div>

        {/* Avatar picker grid */}
        <div className="mt-6 rounded-2xl border border-black/8 p-4">
          <Sk className="mb-3 h-4 w-32" />
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-full bg-black/[0.07]" />
            ))}
          </div>
          <Sk className="mt-4 h-10 w-full rounded-full" />
        </div>

        {/* Theme toggle */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-black/8 p-4">
          <div className="flex flex-col gap-1.5">
            <Sk className="h-4 w-24" />
            <Sk className="h-3 w-44" />
          </div>
          <Sk className="h-8 w-16 rounded-full" />
        </div>
      </section>
    </div>
  );
}
