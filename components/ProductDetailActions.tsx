"use client";

import Link from "next/link";
import WishlistButton from "@/components/WishlistButton";
import SocialShareButton from "@/components/SocialShareButton";

export default function ProductDetailActions({
  productId,
  features,
  productName,
  productDescription,
  productImage,
  productSlug,
  price,
  salePrice,
  discount,
}: {
  productId: string;
  features: Record<string, boolean>;
  productName?: string;
  productDescription?: string;
  productImage?: string;
  productSlug?: string;
  price?: number;
  salePrice?: number;
  discount?: number;
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
        {productSlug && productName && (
          <SocialShareButton
            productId={productId}
            productName={productName}
            productDescription={productDescription}
            productImage={productImage}
            slug={productSlug}
            price={price}
            salePrice={salePrice}
            discount={discount}
          />
        )}
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
      {productSlug && productName && (
        <SocialShareButton
          productId={productId}
          productName={productName}
          productDescription={productDescription}
          productImage={productImage}
          slug={productSlug}
          price={price}
          salePrice={salePrice}
          discount={discount}
        />
      )}
      {features.wishlist ? <WishlistButton productId={productId} /> : null}
    </div>
  );
}
