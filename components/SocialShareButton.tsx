"use client";

import { useState } from "react";
import {
  shareablePlatforms,
  copyToClipboard,
  isWebShareAvailable,
  nativeShare,
  type ShareOptions,
} from "@/lib/social-share";

function ShareIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
}
function LinkIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
}
function CheckIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>;
}

interface SocialShareButtonProps {
  productId: string;
  productName: string;
  productDescription?: string;
  productImage?: string;
  slug: string;
  price?: number;
  salePrice?: number;
  discount?: number;
}

export default function SocialShareButton({
  productId,
  productName,
  productDescription,
  productImage,
  slug,
  price,
  salePrice,
  discount,
}: SocialShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const productUrl = `${baseUrl}/products/${slug}`;

  // Format price for sharing
  const priceText = salePrice && discount && discount > 0
    ? `GHS ${salePrice.toFixed(2)} (was GHS ${price?.toFixed(2)})`
    : price
      ? `GHS ${price.toFixed(2)}`
      : undefined;

  const shareOptions: ShareOptions = {
    url: productUrl,
    title: productName,
    description: productDescription || `Check out ${productName} at 101Hub!`,
    price: priceText,
    discount: discount,
    imageUrl: productImage,
  };

  const handleShare = async (platform: string) => {
    try {
      const platformConfig = shareablePlatforms.find((p) => p.id === platform);
      if (!platformConfig) return;

      const url = platformConfig.getUrl(shareOptions);

      if (platform === "instagram") {
        // Instagram doesn't support direct sharing
        alert("To share on Instagram:\n1. Copy the product link\n2. Open Instagram Stories\n3. Add the link sticker");
        handleCopyLink();
        return;
      }

      // Open share URL in new window
      window.open(url, "_blank", "width=600,height=400");
      setIsOpen(false);
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      const success = await copyToClipboard(productUrl);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Copy error:", error);
      alert("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    try {
      await nativeShare(shareOptions);
      setIsOpen(false);
    } catch (error) {
      console.error("Native share error:", error);
    }
  };

  return (
    <div className="relative inline-block">
      {/* Share Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 transition-colors sm:px-5 sm:py-2.5 sm:text-sm"
        aria-label="Share product"
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {/* Share Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-xl border border-black/10 bg-white shadow-lg overflow-hidden">
          {/* Native Share (if available) */}
          {isWebShareAvailable() && (
            <>
              <button
                onClick={handleNativeShare}
                className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-[var(--brand)]/5 transition-colors border-b border-black/5 flex items-center gap-2"
              >
                <span className="text-lg">↗</span>
                <span>Share via...</span>
              </button>
            </>
          )}

          {/* Social Platforms */}
          <div className="divide-y divide-black/5">
            {shareablePlatforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleShare(platform.id)}
                className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-[var(--brand)]/5 transition-colors flex items-center gap-2"
              >
                <span className="w-6 text-center text-lg">{platform.icon}</span>
                <span>{platform.name}</span>
              </button>
            ))}
          </div>

          {/* Copy Link */}
          <div className="border-t border-black/5">
            <button
              onClick={handleCopyLink}
              className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                copied
                  ? "bg-green-50 text-green-700"
                  : "hover:bg-[var(--brand)]/5"
              }`}
            >
              <span className="text-lg">{copied ? <CheckIcon /> : <LinkIcon />}</span>
              <span>{copied ? "Link Copied!" : "Copy Link"}</span>
            </button>
          </div>

          {/* Close hint */}
          <div className="border-t border-black/5 px-4 py-2 bg-black/2 text-xs text-[var(--ink-soft)]">
            Click outside to close
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
