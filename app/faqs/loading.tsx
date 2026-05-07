const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

export default function FaqsLoading() {
  return (
    <div className="animate-pulse min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Sk className="h-10 w-80 sm:h-12 sm:w-96" />
          <Sk className="h-4 w-full max-w-lg" />
          <Sk className="h-4 w-3/4 max-w-md" />
        </div>

        {/* Search bar */}
        <Sk className="h-13 w-full rounded-full sm:h-14" />

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Sk key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>

        {/* Accordion items */}
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-black/8 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <Sk className={`h-4 ${["w-3/5", "w-2/3", "w-4/5", "w-3/4"][i % 4]}`} />
                <Sk className="h-5 w-5 shrink-0 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
