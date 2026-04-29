"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStoreContent } from "@/lib/use-store-content";

const STORAGE_KEY = "101hub-announcement-seen";

function shouldShow(
  frequency: string,
  popupId: string
): boolean {
  const key = `${STORAGE_KEY}-${popupId}`;
  if (frequency === "always") return true;

  try {
    if (frequency === "once-per-session") {
      return !sessionStorage.getItem(key);
    }
    const stored = localStorage.getItem(key);
    if (!stored) return true;
    if (frequency === "once-ever") return false;
    if (frequency === "once-per-day") {
      return stored !== new Date().toDateString();
    }
  } catch {
    // storage blocked — always show
  }
  return true;
}

function markSeen(frequency: string, popupId: string) {
  if (frequency === "always") return;
  const key = `${STORAGE_KEY}-${popupId}`;
  try {
    if (frequency === "once-per-session") {
      sessionStorage.setItem(key, "1");
    } else if (frequency === "once-ever") {
      localStorage.setItem(key, "1");
    } else if (frequency === "once-per-day") {
      localStorage.setItem(key, new Date().toDateString());
    }
  } catch {
    // storage blocked — ignore
  }
}

export default function AnnouncementPopup() {
  const { content } = useStoreContent();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!content?.announcementPopup) return;
    const popup = content.announcementPopup;

    if (!popup.enabled) return;

    // Date range check
    const now = new Date();
    if (popup.startDate) {
      const start = new Date(popup.startDate);
      start.setHours(0, 0, 0, 0);
      if (now < start) return;
    }
    if (popup.endDate) {
      const end = new Date(popup.endDate);
      end.setHours(23, 59, 59, 999);
      if (now > end) return;
    }

    // Build a stable ID from config (title + image + dates) so changing config resets seen state
    const popupId = btoa(
      encodeURIComponent(
        `${popup.title ?? ""}|${popup.imageUrl ?? ""}|${popup.startDate ?? ""}|${popup.endDate ?? ""}`
      )
    ).slice(0, 16);

    if (!shouldShow(popup.frequency ?? "once-per-session", popupId)) return;

    const delay = (popup.delaySeconds ?? 0) * 1000;
    timerRef.current = setTimeout(() => {
      setVisible(true);
      markSeen(popup.frequency ?? "once-per-session", popupId);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content]);

  if (!visible || !content?.announcementPopup) return null;

  const popup = content.announcementPopup;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={popup.title ?? "Announcement"}
      onClick={(e) => {
        if (e.target === e.currentTarget) setVisible(false);
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: popup.bgColor ?? "#ffffff" }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Close announcement"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors text-lg font-bold leading-none"
        >
          ×
        </button>

        {/* Image / GIF */}
        {popup.imageUrl && (
          <div className="w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={popup.imageUrl}
              alt={popup.imageAlt ?? popup.title ?? "Announcement"}
              className="w-full h-auto block"
              loading="eager"
            />
          </div>
        )}

        {/* Text content */}
        {(popup.title || popup.body || popup.ctaLabel) && (
          <div className="p-5 space-y-3">
            {popup.title && (
              <h2 className="text-lg font-black text-gray-900 leading-tight">
                {popup.title}
              </h2>
            )}
            {popup.body && (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {popup.body}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {popup.ctaLabel && popup.ctaUrl && (
                <Link
                  href={popup.ctaUrl}
                  onClick={() => setVisible(false)}
                  className="block w-full rounded-full bg-[var(--brand)] px-5 py-3 text-center text-sm font-black text-white hover:bg-[var(--brand-deep)] transition-colors active:scale-95"
                >
                  {popup.ctaLabel}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="block w-full rounded-full border border-gray-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {popup.closeLabel ?? "Close"}
              </button>
            </div>
          </div>
        )}

        {/* If only image, show a minimal close button at bottom */}
        {popup.imageUrl && !popup.title && !popup.body && !popup.ctaLabel && (
          <div className="p-3 text-center">
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="text-sm font-semibold text-gray-500 hover:text-gray-700 underline"
            >
              {popup.closeLabel ?? "Close"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
