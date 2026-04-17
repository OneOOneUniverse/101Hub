"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const REF_STORAGE_KEY = "101hub_ref_code";

/**
 * Invisible component mounted in the root layout.
 *
 * 1. Captures ?ref=CODE from any URL → persists to localStorage
 * 2. After a user signs in, auto-claims the stored referral code
 *    via POST /api/referral/claim, then clears localStorage.
 */
function ReferralTrackerInner() {
  const searchParams = useSearchParams();
  const { isSignedIn, user } = useUser();
  const claimedRef = useRef(false);

  // ── Step 1: Persist ?ref= from the URL into localStorage ──
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode && refCode.trim()) {
      localStorage.setItem(REF_STORAGE_KEY, refCode.trim().toUpperCase());
    }
  }, [searchParams]);

  // ── Step 2: Auto-claim referral after sign-in ──
  useEffect(() => {
    if (!isSignedIn || !user || claimedRef.current) return;

    const storedCode = localStorage.getItem(REF_STORAGE_KEY);
    if (!storedCode) return;

    claimedRef.current = true;

    fetch("/api/referral/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: storedCode }),
    })
      .then((res) => {
        if (res.ok) {
          // Successfully claimed — remove the code so it doesn't fire again
          localStorage.removeItem(REF_STORAGE_KEY);
        }
      })
      .catch(() => {
        // Network error — allow retry on next page load
        claimedRef.current = false;
      });
  }, [isSignedIn, user]);

  return null;
}

export default function ReferralTracker() {
  return (
    <Suspense fallback={null}>
      <ReferralTrackerInner />
    </Suspense>
  );
}
