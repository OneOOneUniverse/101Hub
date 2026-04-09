"use client";

import Link from "next/link";
import WishlistButton from "@/components/WishlistButton";

export default function ProductDetailActions({
  productId,
  features,
}: {
  productId: string;
  features: Record<string, boolean>;
}) {
  if (!features.cart) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href="/products"
          className="rounded-full border border-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 sm:px-5 sm:py-2.5 sm:text-sm"
        >
          Back to Products
        </Link>
        {features.wishlist ? <WishlistButton productId={productId} /> : null}
      </div>
    );
  }

  function handleAddToCart() {
    const STORAGE_KEY = "101hub-cart";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const lines = raw ? JSON.parse(raw) : [];
      const existing = Array.isArray(lines) ? lines : [];
      const found = existing.find((line: { productId: string; qty: number }) => line.productId === productId);
      if (found) {
        found.qty += 1;
      } else {
        existing.push({ productId, qty: 1 });
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new Event("101hub:cart-updated"));
      alert("✓ Added to cart!");
    } catch {
      alert("Error adding to cart");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/products"
        className="rounded-full border border-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 sm:px-5 sm:py-2.5 sm:text-sm"
      >
        Back to Products
      </Link>
      <button
        onClick={handleAddToCart}
        className="rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)] sm:px-5 sm:py-2.5 sm:text-sm"
      >
        Add to Cart
      </button>
      <Link
        href="/cart"
        className="rounded-full border border-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 sm:px-5 sm:py-2.5 sm:text-sm"
      >
        View Cart
      </Link>
      {features.wishlist ? <WishlistButton productId={productId} /> : null}
    </div>
  );
}
