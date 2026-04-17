"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const REF_STORAGE_KEY = "101hub_ref_code";
const CLICK_STORAGE_KEY = "101hub_ref_click_id";

/**
 * Invisible component mounted in the root layout.
 *
 * 1. Captures ?ref=CODE from any URL → persists to localStorage
 * 2. Immediately records a "Guest" click via POST /api/referral/click
 *    and stores the returned click_id in localStorage
 * 3. After a user signs in, auto-claims the stored referral code
 *    via POST /api/referral/claim (with clickId), then clears localStorage
 */
function ReferralTrackerInner() {
  const searchParams = useSearchParams();
  const { isSignedIn, user } = useUser();
  const claimedRef = useRef(false);
  const clickRecorded = useRef(false);

  // ── Step 1: Persist ?ref= and immediately record a click ──
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (!refCode || !refCode.trim() || clickRecorded.current) return;

    const code = refCode.trim().toUpperCase();
    localStorage.setItem(REF_STORAGE_KEY, code);
    clickRecorded.current = true;

    // Record the click as a Guest — fire-and-forget but store the clickId
    fetch("/api/referral/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clickId) {
          localStorage.setItem(CLICK_STORAGE_KEY, data.clickId);
        }
      })
      .catch(() => {
        // Silent fail — the click just won't be tracked
        clickRecorded.current = false;
      });
  }, [searchParams]);

  // ── Step 2: Auto-claim referral after sign-in ──
  useEffect(() => {
    if (!isSignedIn || !user || claimedRef.current) return;

    const storedCode = localStorage.getItem(REF_STORAGE_KEY);
    if (!storedCode) return;

    claimedRef.current = true;
    const clickId = localStorage.getItem(CLICK_STORAGE_KEY);

    fetch("/api/referral/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: storedCode, clickId }),
    })
      .then((res) => {
        if (res.ok) {
          // Successfully claimed — clear both keys
          localStorage.removeItem(REF_STORAGE_KEY);
          localStorage.removeItem(CLICK_STORAGE_KEY);
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
