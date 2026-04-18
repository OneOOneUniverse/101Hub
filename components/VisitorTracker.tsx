"use client";

import { useEffect } from "react";
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

export default function VisitorTracker({ userId }: { userId?: string | null }) {
  const pathname = usePathname();

  useEffect(() => {
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
