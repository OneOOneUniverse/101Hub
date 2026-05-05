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

    // Second attempt — show error UI so page isn't blank
    sessionStorage.removeItem(RELOAD_FLAG);
    setShowUI(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  if (!showUI) return null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl" aria-hidden>⚠️</p>
      <h2 className="text-xl font-bold text-[var(--brand-deep)]">Something went wrong</h2>
      <p className="max-w-sm text-sm text-[var(--ink-soft)]">
        An unexpected error occurred. Please try again or return to the homepage.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={() => { sessionStorage.removeItem(RELOAD_FLAG); reset(); }}
          className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
        >
          Try Again
        </button>
        <a
          href="/"
          className="rounded-full border border-[var(--brand)] px-5 py-2.5 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
