"use client";

import { useEffect, useState } from "react";

const RELOAD_FLAG = "101hub_error_auto_reloaded";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showUI, setShowUI] = useState(false);

  useEffect(() => {
    const alreadyRetried = sessionStorage.getItem(RELOAD_FLAG) === "1";

    if (!alreadyRetried) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }

    sessionStorage.removeItem(RELOAD_FLAG);
    setShowUI(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  if (!showUI) return null;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-8 text-center">
      {/* Friendly brand illustration */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--brand)]/10">
        <svg
          className="h-12 w-12 text-[var(--brand)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
        </svg>
      </div>

      <div className="max-w-sm space-y-2">
        <h2 className="text-2xl font-black text-[var(--ink)]">We hit a little bump!</h2>
        <p className="text-[var(--ink-soft)] leading-relaxed">
          Don&apos;t worry — this happens occasionally and we&apos;re already looking into it.
          Your cart and wishlist are safe. Try again or head back to the store.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => { sessionStorage.removeItem(RELOAD_FLAG); reset(); }}
          className="rounded-full bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] transition-colors active:scale-95"
        >
          Try Again
        </button>
        <a
          href="/products"
          className="rounded-full border border-[var(--brand)] px-6 py-2.5 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 transition-colors"
        >
          Browse Products
        </a>
        <a
          href="/"
          className="rounded-full bg-black/5 px-6 py-2.5 text-sm font-bold text-[var(--ink-soft)] hover:bg-black/10 transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
