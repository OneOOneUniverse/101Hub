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

    sessionStorage.removeItem(RELOAD_FLAG);
    setShowUI(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Must render html+body since global-error replaces the root layout
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f4f5f7", fontFamily: "system-ui, sans-serif" }}>
        {showUI && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1.5rem", padding: "2rem", textAlign: "center" }}>
            {/* Brand icon */}
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,107,53,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#ff6b35" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
              </svg>
            </div>

            <div style={{ maxWidth: 380 }}>
              <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 900, color: "#172026" }}>
                Back in a moment!
              </h1>
              <p style={{ margin: 0, color: "#4a5a65", lineHeight: 1.6 }}>
                We ran into a small hiccup. Your cart and wishlist are safe — we&apos;re on it.
                Refresh the page or head to the store to keep browsing.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => { sessionStorage.removeItem(RELOAD_FLAG); reset(); }}
                style={{ background: "#ff6b35", color: "#fff", border: "none", borderRadius: 999, padding: "0.625rem 1.5rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}
              >
                Refresh Page
              </button>
              <a
                href="/products"
                style={{ color: "#d94020", border: "2px solid #ff6b35", borderRadius: 999, padding: "0.5rem 1.5rem", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none", display: "inline-block" }}
              >
                Browse Products
              </a>
              <a
                href="/"
                style={{ color: "#4a5a65", border: "2px solid #e5e7eb", borderRadius: 999, padding: "0.5rem 1.5rem", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none", display: "inline-block" }}
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
