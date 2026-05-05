"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "101hub_error_auto_reloaded";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const alreadyRetried = sessionStorage.getItem(RELOAD_FLAG) === "1";

    if (!alreadyRetried) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }

    // Second attempt: try the built-in reset instead of reloading
    sessionStorage.removeItem(RELOAD_FLAG);
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Never render visible error UI — silently handle all errors
  return null;
}
