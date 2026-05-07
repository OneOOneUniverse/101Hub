const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

function CartRowSkeleton() {
  return (
    <div className="flex gap-3 border-b border-black/8 py-4 last:border-0">
      <div className="h-20 w-20 shrink-0 rounded-xl bg-black/[0.07] sm:h-24 sm:w-24" />
      <div className="flex flex-1 flex-col gap-2">
        <Sk className="h-4 w-3/4" />
        <Sk className="h-3 w-24" />
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sk className="h-8 w-8 rounded-lg" />
            <Sk className="h-5 w-6" />
            <Sk className="h-8 w-8 rounded-lg" />
          </div>
          <Sk className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function CartLoading() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header */}
      <section className="panel p-6">
        <Sk className="h-8 w-44" />
        <Sk className="mt-2 h-4 w-60" />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Cart items */}
        <div className="panel p-4 sm:p-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <CartRowSkeleton key={i} />
          ))}
        </div>

        {/* Order summary */}
        <div className="panel flex flex-col gap-3 p-5 sm:p-6">
          <Sk className="h-5 w-36" />
          <div className="space-y-2.5 border-b border-black/8 pb-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Sk className="h-4 w-28" />
                <Sk className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Sk className="h-5 w-12" />
            <Sk className="h-5 w-20" />
          </div>
          <Sk className="mt-2 h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
