"use client";

import { useState } from "react";
import {
  shareablePlatforms,
  copyToClipboard,
  isWebShareAvailable,
  nativeShare,
  type ShareOptions,
} from "@/lib/social-share";
import { toast } from "@/lib/toast-store";

function ShareIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
}
function LinkIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>;
}

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
        toast.info("To share on Instagram: copy the service link, open Instagram Stories, then add the link sticker.");
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
      toast.error("Failed to copy link — please copy it manually");
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
          <ShareIcon />
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
                  <span>{copied ? <CheckIcon /> : <LinkIcon />}</span>
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
        <ShareIcon />
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
              <span className="text-lg">{copied ? <CheckIcon /> : <LinkIcon />}</span>
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
