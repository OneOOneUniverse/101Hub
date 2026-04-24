"use client";

import { useEffect, useState } from "react";

interface ViewData {
  views: number;
  uniqueUsers: number;
}

export default function ViewCounter({ page }: { page: string }) {
  const [data, setData] = useState<ViewData | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(
          `/api/analytics/views?page=${encodeURIComponent(page)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          setData((await res.json()) as ViewData);
        }
      } catch {
        // silently fail — never block UI
      }
    };

    void fetchCount();
    const interval = setInterval(() => void fetchCount(), 30_000);
    return () => clearInterval(interval);
  }, [page]);

  if (!data) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span>
        <strong className="text-[var(--brand-deep)]">
          {data.views.toLocaleString()}
        </strong>{" "}
        {data.views === 1 ? "view" : "views"} ·{" "}
        <strong className="text-[var(--brand-deep)]">
          {data.uniqueUsers.toLocaleString()}
        </strong>{" "}
        unique {data.uniqueUsers === 1 ? "viewer" : "viewers"}
      </span>
    </div>
  );
}
