const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

function ReviewCardSkeleton() {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-black/[0.07]" />
          <div className="flex flex-col gap-1.5">
            <Sk className="h-4 w-28" />
            <Sk className="h-3 w-20" />
          </div>
        </div>
        <Sk className="h-4 w-16" />
      </div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Sk key={i} className="h-4 w-4 rounded" />
        ))}
      </div>
      <div className="mt-2.5 space-y-1.5">
        <Sk className="h-3 w-full" />
        <Sk className="h-3 w-5/6" />
        <Sk className="h-3 w-3/4" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Sk className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function ReviewsLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Sort bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Sk className="h-9 w-24 rounded-full" />
          <Sk className="h-9 w-28 rounded-full" />
        </div>
        <Sk className="h-4 w-20" />
      </div>

      {/* Submit form panel */}
      <section className="panel p-5 sm:p-6">
        <Sk className="mb-3 h-5 w-36" />
        <div className="mb-3 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Sk key={i} className="h-8 w-8 rounded" />
          ))}
        </div>
        <Sk className="h-28 w-full rounded-xl" />
        <Sk className="mt-3 h-10 w-32 rounded-full" />
      </section>

      {/* Review list */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ReviewCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
