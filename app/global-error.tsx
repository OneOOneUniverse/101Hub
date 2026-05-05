"use client";

import { useEffect, useState } from "react";

const RELOAD_FLAG = "101hub_error_auto_reloaded";

export default function GlobalError({
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

  // Must render html+body since global-error replaces the root layout
  return (
    <html>
      <body>
        {showUI && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px", padding: "24px", textAlign: "center", fontFamily: "sans-serif" }}>
            <p style={{ fontSize: "48px", margin: 0 }} aria-hidden>⚠️</p>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#1e1b4b" }}>Something went wrong</h2>
            <p style={{ fontSize: "14px", color: "#6b7280", maxWidth: "320px", margin: 0 }}>
              An unexpected error occurred. Please try again or return to the homepage.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => { sessionStorage.removeItem(RELOAD_FLAG); reset(); }}
                style={{ background: "#6366f1", color: "white", border: "none", borderRadius: "999px", padding: "10px 20px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{ color: "#6366f1", border: "2px solid #6366f1", borderRadius: "999px", padding: "10px 20px", fontWeight: "bold", textDecoration: "none", fontSize: "14px", display: "inline-block" }}
              >
                Go Home
              </a>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
