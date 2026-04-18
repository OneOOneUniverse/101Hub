"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getVisitorId(): string {
  const key = "101hub_vid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

/** Returns true if this page was already tracked this browser session. */
function alreadyTracked(page: string): boolean {
  const key = "101hub_tracked";
  const raw = sessionStorage.getItem(key);
  const set: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  if (set.includes(page)) return true;
  set.push(page);
  sessionStorage.setItem(key, JSON.stringify(set));
  return false;
}

export default function VisitorTracker({ userId }: { userId?: string | null }) {
  const pathname = usePathname();
  const sent = useRef(false);

  useEffect(() => {
    // Reset ref when pathname changes so new pages still get tracked
    sent.current = false;
  }, [pathname]);

  useEffect(() => {
    // Guard: StrictMode double-mount protection
    if (sent.current) return;
    sent.current = true;

    // Guard: don't re-track if same page was already tracked this session
    if (alreadyTracked(pathname)) return;

    const track = async () => {
      try {
        const visitorId = getVisitorId();
        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "page_view",
            page: pathname,
            user_id: userId ?? null,
            metadata: { visitor_id: visitorId },
          }),
        });
      } catch {
        // silently fail — never block UI for analytics
      }
    };

    void track();
  }, [pathname, userId]);

  return null;
}
