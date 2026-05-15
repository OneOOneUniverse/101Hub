"use client";

import { useEffect, useState } from "react";
import { isInWaitlist, toggleWaitlist } from "@/lib/product-feedback";

type WaitlistButtonProps = {
  productId: string;
  compact?: boolean;
  iconOnly?: boolean;
};

export default function WaitlistButton({
  productId,
  compact = false,
  iconOnly = false,
}: WaitlistButtonProps) {
  const [waitlisted, setWaitlisted] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return isInWaitlist(productId);
  });

  useEffect(() => {
    const sync = () => setWaitlisted(isInWaitlist(productId));
    window.addEventListener("101hub:waitlist-updated", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("101hub:waitlist-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [productId]);

  return (
    <button
      type="button"
      onClick={() => setWaitlisted(toggleWaitlist(productId))}
      className={`rounded-full border font-bold transition ${
        waitlisted
          ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          : "border-blue-600 text-blue-700 hover:bg-blue-600/10"
      } ${
        iconOnly
          ? "inline-flex h-8 w-8 items-center justify-center p-0"
          : compact
            ? "px-2.5 py-1.5 text-xs"
            : "px-4 py-2 text-sm"
      }`}
      aria-pressed={waitlisted}
      aria-label={waitlisted ? "Remove from waitlist" : "Add to waitlist"}
    >
      {iconOnly ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : compact ? (
        waitlisted ? "On Waitlist" : "Waitlist"
      ) : waitlisted ? (
        "On Waitlist ✓"
      ) : (
        "Add to Waitlist"
      )}
    </button>
  );
}
