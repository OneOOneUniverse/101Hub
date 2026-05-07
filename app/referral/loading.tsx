const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

export default function ReferralLoading() {
  return (
    <div className="animate-pulse space-y-5 py-6">
      {/* Referral code card */}
      <section className="panel p-6">
        <Sk className="mb-3 h-6 w-44" />
        <Sk className="h-4 w-72" />
        <div className="mt-4 flex gap-2">
          <Sk className="h-12 flex-1 rounded-xl font-mono" />
          <Sk className="h-12 w-32 rounded-xl" />
        </div>
      </section>

      {/* Progress bar */}
      <section className="panel p-5">
        <div className="mb-2 flex justify-between">
          <Sk className="h-4 w-24" />
          <Sk className="h-4 w-16" />
        </div>
        <Sk className="h-4 w-full rounded-full" />
      </section>

      {/* Tier cards */}
      <div className="space-y-3">
        {["Bronze", "Silver", "Gold", "Platinum", "Diamond"].map((tier) => (
          <div key={tier} className="panel flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-black/[0.07]" />
              <div className="flex flex-col gap-1.5">
                <Sk className="h-4 w-20" />
                <Sk className="h-3 w-32" />
              </div>
            </div>
            <Sk className="h-9 w-20 shrink-0 rounded-full" />
          </div>
        ))}
      </div>

      {/* Stats row */}
      <section className="panel p-5">
        <Sk className="mb-4 h-5 w-28" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-black/8 p-3">
              <Sk className="h-7 w-12" />
              <Sk className="h-3 w-20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
