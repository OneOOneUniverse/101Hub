export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-6 w-full animate-pulse">
      {/* Page header skeleton */}
      <div className="h-7 w-48 rounded-lg bg-[var(--surface-raised)]" />

      {/* Card grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden bg-[var(--surface-raised)]">
            <div className="aspect-square w-full bg-[var(--surface-raised,#f3f3f3)]" />
            <div className="p-3 flex flex-col gap-2">
              <div className="h-3 w-3/4 rounded bg-[var(--border,#e5e7eb)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--border,#e5e7eb)]" />
              <div className="h-5 w-1/3 rounded bg-[var(--border,#e5e7eb)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
