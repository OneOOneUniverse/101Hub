"use client";

import { useState } from "react";
import {
  shareablePlatforms,
  copyToClipboard,
  isWebShareAvailable,
  nativeShare,
  type ShareOptions,
} from "@/lib/social-share";

interface ServiceShareButtonProps {
  serviceId: string;
  serviceName: string;
  serviceDetails?: string;
  priceDisplay?: string;
  /** "card" = compact icon-only button for listing cards; "detail" = full button for detail page */
  variant?: "card" | "detail";
}

export default function ServiceShareButton({
  serviceId,
  serviceName,
  serviceDetails,
  priceDisplay,
  variant = "detail",
}: ServiceShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const serviceUrl = `${baseUrl}/services/${serviceId}`;

  const description = serviceDetails
    ? serviceDetails.slice(0, 120) + (serviceDetails.length > 120 ? "…" : "")
    : `Book this service on 101Hub!`;

  const shareOptions: ShareOptions = {
    url: serviceUrl,
    title: serviceName,
    description: priceDisplay
      ? `${description} — From ${priceDisplay}`
      : description,
    price: priceDisplay,
  };

  const handleShare = async (platform: string) => {
    try {
      const platformConfig = shareablePlatforms.find((p) => p.id === platform);
      if (!platformConfig) return;

      if (platform === "instagram") {
        alert("To share on Instagram:\n1. Copy the service link below\n2. Open Instagram Stories\n3. Add the link sticker");
        await handleCopyLink();
        return;
      }

      window.open(platformConfig.getUrl(shareOptions), "_blank", "width=600,height=400");
      setIsOpen(false);
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      const success = await copyToClipboard(serviceUrl);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      alert("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    try {
      await nativeShare(shareOptions);
      setIsOpen(false);
    } catch {
      // fall through to manual menu
    }
  };

  if (variant === "card") {
    return (
      <div className="relative inline-block">
        <button
          onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--brand)] text-base hover:bg-[var(--brand)]/10 transition-colors"
          title="Share this service"
          aria-label="Share this service"
        >
          📤
        </button>

        {isOpen && (
          <>
            <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-black/10 bg-white shadow-md overflow-hidden min-w-[160px]">
              {shareablePlatforms.slice(0, 4).map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleShare(platform.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--brand)]/5 transition-colors"
                >
                  <span>{platform.icon}</span>
                  <span>{platform.name}</span>
                </button>
              ))}
              <div className="border-t border-black/5">
                <button
                  onClick={handleCopyLink}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${copied ? "bg-green-50 text-green-700" : "hover:bg-[var(--brand)]/5"}`}
                >
                  <span>{copied ? "✓" : "🔗"}</span>
                  <span>{copied ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 transition-colors sm:px-5 sm:py-2.5 sm:text-sm"
        aria-label="Share this service"
      >
        <span>📤</span>
        <span>Share</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-xl border border-black/10 bg-white shadow-lg overflow-hidden">
          {isWebShareAvailable() && (
            <button
              onClick={handleNativeShare}
              className="flex w-full items-center gap-2 border-b border-black/5 px-4 py-3 text-sm font-semibold hover:bg-[var(--brand)]/5 transition-colors"
            >
              <span className="text-lg">↗</span>
              <span>Share via…</span>
            </button>
          )}

          <div className="divide-y divide-black/5">
            {shareablePlatforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleShare(platform.id)}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-[var(--brand)]/5 transition-colors"
              >
                <span className="w-6 text-center text-lg">{platform.icon}</span>
                <span>{platform.name}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-black/5">
            <button
              onClick={handleCopyLink}
              className={`flex w-full items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                copied ? "bg-green-50 text-green-700" : "hover:bg-[var(--brand)]/5"
              }`}
            >
              <span className="text-lg">{copied ? "✓" : "🔗"}</span>
              <span>{copied ? "Link Copied!" : "Copy Link"}</span>
            </button>
          </div>

          <div className="border-t border-black/5 bg-black/[0.02] px-4 py-2 text-xs text-[var(--ink-soft)]">
            Click outside to close
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
