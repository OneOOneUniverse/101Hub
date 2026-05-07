const Sk = ({ className }: { className: string }) => (
  <div className={`rounded-lg bg-black/[0.07] ${className}`} />
);

function FieldSkeleton({ label = true }: { label?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Sk className="h-3.5 w-28" />}
      <Sk className="h-11 w-full rounded-xl" />
    </div>
  );
}

export default function CheckoutLoading() {
  return (
    <div className="animate-pulse space-y-5 sm:space-y-6">
      {/* Customer info */}
      <section className="panel p-5 sm:p-6">
        <Sk className="mb-4 h-6 w-44" />
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </section>

      {/* Delivery */}
      <section className="panel p-5 sm:p-6">
        <Sk className="mb-4 h-6 w-36" />
        <div className="space-y-4">
          <FieldSkeleton />
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton />
          {/* Delivery type toggle */}
          <div className="flex gap-2">
            <Sk className="h-10 flex-1 rounded-full" />
            <Sk className="h-10 flex-1 rounded-full" />
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="panel p-5 sm:p-6">
        <Sk className="mb-4 h-6 w-32" />
        {/* Provider pills */}
        <div className="mb-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Sk key={i} className="h-10 flex-1 rounded-xl" />
          ))}
        </div>
        <FieldSkeleton />
        <div className="mt-3">
          <Sk className="h-24 w-full rounded-xl" />
        </div>
      </section>

      {/* Order summary + submit */}
      <section className="panel p-5 sm:p-6">
        <Sk className="mb-4 h-6 w-40" />
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Sk className="h-4 w-32" />
              <Sk className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-black/8 pt-4">
          <div className="flex justify-between">
            <Sk className="h-5 w-12" />
            <Sk className="h-5 w-24" />
          </div>
        </div>
        <Sk className="mt-5 h-13 w-full rounded-full" />
      </section>
    </div>
  );
}
