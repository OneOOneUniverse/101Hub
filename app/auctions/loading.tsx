const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

function AuctionCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
      <div className="relative h-44 w-full bg-black/[0.07]">
        {/* Status badge */}
        <div className="absolute left-2 top-2 h-5 w-12 rounded-full bg-black/[0.12]" />
        {/* Bid count chip */}
        <div className="absolute right-2 top-2 h-5 w-16 rounded-full bg-black/[0.12]" />
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <Sk className="h-5 w-full" />
        <Sk className="h-4 w-3/4" />
        <div className="flex items-center justify-between">
          <Sk className="h-4 w-24" />
          <Sk className="h-6 w-20 rounded-full" />
        </div>
        <Sk className="mt-1 h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function AuctionsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <section className="panel p-6">
        <Sk className="h-8 w-40" />
        <Sk className="mt-2 h-4 w-72" />
      </section>

      {/* Auction cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <AuctionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
