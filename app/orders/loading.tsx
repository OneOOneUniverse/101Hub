const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

export default function OrdersLoading() {
  return (
    <div className="animate-pulse mx-auto max-w-lg space-y-4 py-8 px-4">
      {/* Icon + header */}
      <section className="panel flex flex-col items-center gap-3 p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-black/[0.07]" />
        <Sk className="h-8 w-52" />
        <Sk className="h-4 w-72" />
      </section>

      {/* Lookup form */}
      <section className="panel p-6">
        <Sk className="mb-1.5 h-3.5 w-28" />
        <Sk className="h-12 w-full rounded-xl" />
        <Sk className="mt-1.5 h-3 w-48" />
        <Sk className="mt-5 h-11 w-full rounded-full" />
      </section>

      {/* Recent orders */}
      <section className="panel p-5">
        <Sk className="mb-4 h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-black/8 p-3">
              <div className="flex flex-col gap-1.5">
                <Sk className="h-4 w-32" />
                <Sk className="h-3 w-20" />
              </div>
              <Sk className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
