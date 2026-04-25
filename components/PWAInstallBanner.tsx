"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if dismissed recently
    const lastDismissed = localStorage.getItem("pwa-banner-dismissed");
    if (lastDismissed && Date.now() - Number(lastDismissed) < 1000 * 60 * 60 * 24 * 7) return;

    // Detect iOS Safari (no beforeinstallprompt, needs manual instructions)
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as Record<string, unknown>).MSStream;
    const inSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
    if (ios && inSafari) {
      setIsIOS(true);
      setVisible(true);
      return;
    }

    // Android Chrome — wait for the install prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", String(Date.now()));
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }

  if (!visible || dismissed) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-safe-area-inset-bottom"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <div className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          {/* App icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/log.png"
            alt="101 Hub"
            className="h-14 w-14 rounded-2xl border border-black/10 shrink-0 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="font-black text-[var(--brand-deep)] text-base leading-tight">Install 101 Hub</p>
            {isIOS ? (
              <p className="text-xs text-[var(--ink-soft)] mt-0.5 leading-snug">
                Tap the <strong>Share</strong> button below, then <strong>&ldquo;Add to Home Screen&rdquo;</strong> to install.
              </p>
            ) : (
              <p className="text-xs text-[var(--ink-soft)] mt-0.5 leading-snug">
                Get faster access, shop offline &amp; receive order updates.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1.5 hover:bg-black/5 text-[var(--ink-soft)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {!isIOS && (
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={dismiss}
              className="flex-1 rounded-full border border-black/10 py-2 text-sm font-semibold text-[var(--ink-soft)] hover:bg-black/5"
            >
              Not now
            </button>
            <button
              onClick={install}
              className="flex-1 rounded-full bg-[var(--brand)] py-2 text-sm font-black text-white hover:bg-[var(--brand-deep)]"
            >
              Install App
            </button>
          </div>
        )}

        {isIOS && (
          <div className="px-4 pb-4">
            {/* iOS arrow hint */}
            <div className="flex items-center gap-2 rounded-xl bg-[var(--brand)]/5 border border-[var(--brand)]/10 px-3 py-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--brand)] shrink-0"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              <p className="text-xs text-[var(--brand-deep)] font-semibold">
                Share → Add to Home Screen
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
