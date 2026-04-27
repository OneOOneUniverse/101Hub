"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

function getVisitorId(): string {
  const key = "101hub_vid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

/** Track signup once per user (localStorage flag). */
function shouldTrackSignup(userId: string): boolean {
  const key = "101hub_signup_tracked";
  const raw = localStorage.getItem(key);
  const tracked: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  if (tracked.includes(userId)) return false;
  tracked.push(userId);
  localStorage.setItem(key, JSON.stringify(tracked));
  return true;
}

export default function VisitorTracker({ userId }: { userId?: string | null }) {
  const pathname = usePathname();
  // In-memory ref — survives StrictMode remount so the second invocation is a no-op,
  // but resets when the user navigates so every page change is recorded.
  const lastTracked = useRef<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    // Only block StrictMode double-invocation (same pathname in same render cycle).
    // Different pathnames are always tracked, including revisiting a page.
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const visitorId = getVisitorId();
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "page_view",
        page: pathname,
        user_id: userId ?? null,
        metadata: { visitor_id: visitorId },
      }),
    }).catch(() => {
      // silently fail — never block UI for analytics
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Client-side signup tracking fallback — fires once per user
  useEffect(() => {
    if (!user?.id) return;

    // Only track users created in the last 7 days as signups
    const createdAt = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (createdAt < sevenDaysAgo) return;

    if (!shouldTrackSignup(user.id)) return;

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "signup",
        user_id: user.id,
        metadata: {
          email: user.primaryEmailAddress?.emailAddress ?? "",
          source: "client",
        },
      }),
    }).catch(() => {});
  }, [user]);

  return null;
}
