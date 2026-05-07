const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
      <div className="aspect-square w-full bg-black/[0.07]" />
      <div className="flex flex-col gap-2 p-3">
        <Sk className="h-3 w-16" />
        <Sk className="h-4 w-full" />
        <Sk className="h-3 w-3/4" />
        <Sk className="mt-1 h-5 w-20" />
        <div className="flex gap-2 pt-1">
          <Sk className="h-8 flex-1 rounded-full" />
          <Sk className="h-8 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function ProductsLoading() {
  return (
    <div className="animate-pulse space-y-4 sm:space-y-6">
      {/* Header panel */}
      <section className="panel p-4 sm:p-6 md:p-8">
        <Sk className="h-8 w-36 sm:h-9" />
        <Sk className="mt-2 h-4 w-72" />

        {/* Category strip */}
        <div className="mt-5">
          <Sk className="mb-3 h-3 w-32" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/[0.07] sm:h-24 sm:w-24"
              />
            ))}
          </div>
        </div>

        {/* Search + sort bar */}
        <div className="mt-4 flex gap-3">
          <Sk className="h-11 flex-1 rounded-full" />
          <Sk className="h-11 w-44 rounded-full" />
        </div>
      </section>

      {/* Featured products strip */}
      <section className="panel p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Sk className="h-5 w-40" />
            <Sk className="h-3 w-52" />
          </div>
          <Sk className="h-8 w-20 rounded-full" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-36 shrink-0 overflow-hidden rounded-2xl border border-black/8 bg-white sm:w-44">
              <div className="aspect-square w-full bg-black/[0.07]" />
              <div className="flex flex-col gap-1.5 p-2.5">
                <Sk className="h-2.5 w-14" />
                <Sk className="h-4 w-full" />
                <Sk className="h-4 w-3/4" />
                <Sk className="mt-1 h-5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Products grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
