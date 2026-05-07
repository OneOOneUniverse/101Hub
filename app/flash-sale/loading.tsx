const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

function SaleCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
      <div className="relative aspect-square w-full bg-black/[0.07]">
        <div className="absolute left-2 top-2 h-6 w-12 rounded-lg bg-red-200/60" />
      </div>
      <div className="flex flex-col gap-2 p-3">
        <Sk className="h-3 w-16" />
        <Sk className="h-4 w-full" />
        <div className="flex items-baseline gap-2">
          <Sk className="h-5 w-20" />
          <Sk className="h-3 w-14" />
        </div>
        <Sk className="h-3 w-28 text-green-600" />
        <div className="flex gap-2 pt-1">
          <Sk className="h-8 flex-1 rounded-full" />
          <Sk className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function FlashSaleLoading() {
  return (
    <div className="animate-pulse space-y-5 sm:space-y-6">
      {/* Hero panel */}
      <section className="panel relative overflow-hidden p-8 sm:p-12" style={{ minHeight: 220 }}>
        <div className="flex flex-col gap-3">
          <Sk className="h-5 w-24 rounded-full" />
          <Sk className="h-9 w-72 sm:h-11" />
          <Sk className="h-4 w-80" />
          <div className="mt-2 flex items-center gap-3">
            <Sk className="h-7 w-7 rounded-full" />
            <Sk className="h-7 w-36" />
          </div>
        </div>
      </section>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SaleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
