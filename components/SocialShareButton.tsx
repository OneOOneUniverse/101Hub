"use client";

import { useState } from "react";
import {
  shareablePlatforms,
  copyToClipboard,
  isWebShareAvailable,
  nativeShare,
  type ShareOptions,
} from "@/lib/social-share";

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
        <span>📤</span>
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
              <span className="text-lg">{copied ? "✓" : "🔗"}</span>
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
