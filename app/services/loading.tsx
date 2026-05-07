const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

function ServiceCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
      <div className="h-40 w-full bg-black/[0.07]" />
      <div className="flex flex-col gap-2.5 p-4">
        <Sk className="h-5 w-3/4" />
        <Sk className="h-3 w-full" />
        <Sk className="h-3 w-5/6" />
        <div className="mt-1 flex items-center justify-between">
          <Sk className="h-4 w-20" />
          <Sk className="h-4 w-16" />
        </div>
        <Sk className="mt-2 h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function ServicesLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <section className="panel p-6 sm:p-8">
        <Sk className="h-8 w-52 sm:h-10" />
        <Sk className="mt-2 h-4 w-80" />
        <Sk className="mt-1 h-4 w-64" />
      </section>

      {/* Services grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ServiceCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
