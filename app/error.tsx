"use client";

import { useEffect } from "react";

// Key stored in sessionStorage so we only auto-reload once per error event.
// If after the reload the page still errors, we show the manual error UI instead
// of looping forever.
const RELOAD_FLAG = "101hub_error_auto_reloaded";

function isTransientError(error: Error): boolean {
  const name = error?.name ?? "";
  const msg = (error?.message ?? "").toLowerCase();
  return (
    // Webpack / Next.js chunk load failures
    name === "ChunkLoadError" ||
    msg.includes("loading chunk") ||
    msg.includes("failed to fetch dynamically imported module") ||
    // Safari phrasing
    msg.includes("error loading dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    // Generic network interruption during navigation
    msg.includes("load failed") ||
    msg.includes("networkerror") ||
    msg.includes("failed to load resource") ||
    // CSS chunk failure
    msg.includes("loading css chunk")
  );
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const alreadyRetried = sessionStorage.getItem(RELOAD_FLAG) === "1";

    if (isTransientError(error) && !alreadyRetried) {
      // Mark that we attempted a reload so we don't loop on genuine errors
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }

    // Clear the flag so the next distinct navigation error can retry once
    if (!isTransientError(error)) {
      sessionStorage.removeItem(RELOAD_FLAG);
    }
  }, [error]);

  // Clear the reload flag once the user successfully navigates again
  // (reset() is called by Next.js when the error boundary recovers)
  function handleReset() {
    sessionStorage.removeItem(RELOAD_FLAG);
    reset();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        background: "var(--base, #f8f8f8)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "24px",
          padding: "40px 32px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 900,
            marginBottom: "8px",
            color: "#111",
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#666",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          The page hit an unexpected error. This usually fixes itself on a
          refresh.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(RELOAD_FLAG);
              window.location.reload();
            }}
            style={{
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "999px",
              padding: "12px 28px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: "transparent",
              color: "#111",
              border: "2px solid #111",
              borderRadius: "999px",
              padding: "12px 28px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
