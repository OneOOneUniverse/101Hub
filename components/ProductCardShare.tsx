"use client";

import { useState } from "react";
import { shareablePlatforms, copyToClipboard, type ShareOptions } from "@/lib/social-share";

interface ProductCardShareProps {
  productName: string;
  productDescription?: string;
  slug: string;
  compact?: boolean;
  iconOnly?: boolean;
  price?: number;
  salePrice?: number;
  discount?: number;
}

export default function ProductCardShare({
  productName,
  productDescription,
  slug,
  compact = false,
  iconOnly = false,
  price,
  salePrice,
  discount,
}: ProductCardShareProps) {
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
  };

  const handleShare = (platform: string) => {
    try {
      const platformConfig = shareablePlatforms.find((p) => p.id === platform);
      if (!platformConfig) return;

      const url = platformConfig.getUrl(shareOptions);

      if (platform === "instagram") {
        alert("To share on Instagram:\n1. Copy the product link\n2. Open Instagram Stories\n3. Add the link sticker");
        handleCopyLink();
        return;
      }

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
    } catch {
      alert("Failed to copy link");
    }
  };

  if (iconOnly) {
    return (
      <div className="relative inline-block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--brand)] p-0 font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 transition-colors"
          title="Share product"
          aria-label="Share product"
        >
          📤
        </button>

        {isOpen && (
          <>
            <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-black/10 bg-white shadow-md overflow-hidden min-w-max">
              {shareablePlatforms.slice(0, 3).map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleShare(platform.id)}
                  className="w-full px-3 py-2 text-center text-sm hover:bg-[var(--brand)]/5 transition-colors"
                  title={platform.name}
                >
                  {platform.icon}
                </button>
              ))}
              <div className="border-t border-black/5">
                <button
                  onClick={handleCopyLink}
                  className="w-full px-3 py-2 text-center text-sm hover:bg-[var(--brand)]/5 transition-colors"
                  title="Copy link"
                >
                  {copied ? "✓" : "🔗"}
                </button>
              </div>
            </div>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
          </>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full border border-[var(--brand)] px-2.5 py-1.5 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 transition-colors flex items-center gap-1"
          title="Share product"
          aria-label="Share product"
        >
          <span>📤</span>
          <span className="hidden sm:inline">Share</span>
        </button>

        {isOpen && (
          <>
            <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden min-w-max">
              <div className="grid grid-cols-3 gap-1 p-2">
                {shareablePlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleShare(platform.id)}
                    className="flex flex-col items-center gap-1 rounded px-2 py-2 hover:bg-[var(--brand)]/5 transition-colors"
                    title={platform.name}
                  >
                    <span className="text-lg">{platform.icon}</span>
                    <span className="text-xs">{platform.name}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-black/5">
                <button
                  onClick={handleCopyLink}
                  className={`w-full px-3 py-2 text-xs font-semibold transition-colors ${
                    copied ? "bg-green-50 text-green-700" : "hover:bg-[var(--brand)]/5"
                  }`}
                >
                  {copied ? "✓ Copied" : "🔗 Link"}
                </button>
              </div>
            </div>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
          </>
        )}
      </div>
    );
  }

  // Full size variant for default case
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 transition-colors"
        title="Share product"
        aria-label="Share product"
      >
        <span>📤</span>
        <span>Share</span>
      </button>

      {isOpen && (
        <>
          <div className="absolute right-0 top-full mt-2 z-50 rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden min-w-max">
            <div className="grid grid-cols-3 gap-1 p-2">
              {shareablePlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleShare(platform.id)}
                  className="flex flex-col items-center gap-1 rounded px-2 py-2 hover:bg-[var(--brand)]/5 transition-colors"
                  title={platform.name}
                >
                  <span className="text-xl">{platform.icon}</span>
                  <span className="text-xs">{platform.name}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-black/5">
              <button
                onClick={handleCopyLink}
                className={`w-full px-3 py-2 text-xs font-semibold transition-colors ${
                  copied ? "bg-green-50 text-green-700" : "hover:bg-[var(--brand)]/5"
                }`}
              >
                {copied ? "✓ Link Copied" : "🔗 Copy Link"}
              </button>
            </div>
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}
