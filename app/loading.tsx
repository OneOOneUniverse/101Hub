// Skeleton for the home page — PromoSlider + Hero panel
const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 sm:space-y-6">
      {/* PromoSlider placeholder */}
      <div className="overflow-hidden rounded-xl" style={{ aspectRatio: "3/1" }}>
        <div className="h-full w-full bg-black/[0.07]" />
      </div>

      {/* Hero panel */}
      <section className="panel relative overflow-hidden p-8 sm:p-12 md:p-16" style={{ minHeight: 280 }}>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
          <Sk className="h-5 w-24 rounded-full" />
          <Sk className="h-9 w-3/4 sm:h-11" />
          <Sk className="h-4 w-full" />
          <Sk className="h-4 w-5/6" />
          <div className="mt-2 flex gap-3">
            <Sk className="h-10 w-32 rounded-full" />
            <Sk className="h-10 w-28 rounded-full" />
          </div>
        </div>
      </section>

      {/* Feature highlight strip */}
      <section className="panel p-6">
        <Sk className="mb-4 h-6 w-44" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-black/8 p-4">
              <Sk className="h-8 w-8 rounded-lg" />
              <Sk className="h-4 w-3/4" />
              <Sk className="h-3 w-full" />
              <Sk className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
