"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "101hub_error_auto_reloaded";

function isTransientError(error: Error): boolean {
  const name = error?.name ?? "";
  const msg = (error?.message ?? "").toLowerCase();
  return (
    name === "ChunkLoadError" ||
    msg.includes("loading chunk") ||
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("load failed") ||
    msg.includes("networkerror") ||
    msg.includes("failed to load resource") ||
    msg.includes("loading css chunk")
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const alreadyRetried = sessionStorage.getItem(RELOAD_FLAG) === "1";
    if (isTransientError(error) && !alreadyRetried) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }
    if (!isTransientError(error)) {
      sessionStorage.removeItem(RELOAD_FLAG);
    }
  }, [error]);

  function handleReset() {
    sessionStorage.removeItem(RELOAD_FLAG);
    reset();
  }

  return (
    <html>
      <body
        style={{
          margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#f8f8f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
          textAlign: "center",
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
          <h1 style={{ fontSize: "20px", fontWeight: 900, marginBottom: "8px", color: "#111" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.6, marginBottom: "24px" }}>
            The page hit an unexpected error. This usually fixes itself on a refresh.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => { sessionStorage.removeItem(RELOAD_FLAG); window.location.reload(); }}
              style={{ background: "#111", color: "#fff", border: "none", borderRadius: "999px", padding: "12px 28px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
            >
              Reload
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{ background: "transparent", color: "#111", border: "2px solid #111", borderRadius: "999px", padding: "12px 28px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
