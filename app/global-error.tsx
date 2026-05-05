"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "101hub_error_auto_reloaded";

export default function GlobalError({
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

    sessionStorage.removeItem(RELOAD_FLAG);
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Must render html+body since global-error replaces the root layout
  return (
    <html>
      <body />
    </html>
  );
}
