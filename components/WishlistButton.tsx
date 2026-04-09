"use client";

import { useEffect, useState } from "react";
import { isInWishlist, toggleWishlist } from "@/lib/product-feedback";

type WishlistButtonProps = {
  productId: string;
  compact?: boolean;
  iconOnly?: boolean;
};

export default function WishlistButton({
  productId,
  compact = false,
  iconOnly = false,
}: WishlistButtonProps) {
  const [wishlisted, setWishlisted] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return isInWishlist(productId);
  });

  useEffect(() => {
    const sync = () => setWishlisted(isInWishlist(productId));
    window.addEventListener("101hub:wishlist-updated", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("101hub:wishlist-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [productId]);

  return (
    <button
      type="button"
      onClick={() => setWishlisted(toggleWishlist(productId))}
      className={`rounded-full border border-[var(--brand)] font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 ${
        iconOnly
          ? "inline-flex h-8 w-8 items-center justify-center p-0"
          : compact
            ? "px-2.5 py-1.5 text-xs"
            : "px-4 py-2 text-sm"
      }`}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      {iconOnly ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${wishlisted ? "fill-[var(--brand-deep)]" : "fill-none"}`}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s-6.8-4.3-9.2-8.4A5.5 5.5 0 0 1 11 5.3L12 6.4l1-1.1a5.5 5.5 0 0 1 8.2 7.3C18.8 16.7 12 21 12 21Z" />
        </svg>
      ) : compact ? (
        wishlisted ? "Saved" : "Wishlist"
      ) : wishlisted ? (
        "Wishlisted"
      ) : (
        "Add to Wishlist"
      )}
    </button>
  );
}
