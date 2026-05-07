const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

function WishlistCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
      <div className="h-28 w-full bg-black/[0.07] sm:h-36" />
      <div className="flex flex-col gap-2 p-3">
        <Sk className="h-3 w-16" />
        <Sk className="h-4 w-full" />
        <Sk className="h-3 w-5/6" />
        <Sk className="h-3 w-3/4" />
        <div className="mt-2 flex items-center justify-between">
          <Sk className="h-5 w-20" />
          <Sk className="h-4 w-10" />
        </div>
        <Sk className="mt-1 h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function WishlistLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Header */}
      <section className="panel p-6">
        <Sk className="h-8 w-36" />
        <Sk className="mt-2 h-4 w-60" />
      </section>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <WishlistCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
