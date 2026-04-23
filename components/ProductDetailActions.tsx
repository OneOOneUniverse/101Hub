"use client";

import { useState } from "react";
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
  sizes,
  colors,
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
  sizes?: string[];
  colors?: string[];
}) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

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
    if (sizes && sizes.length > 0 && !selectedSize) {
      alert("Please select a size before adding to cart.");
      return;
    }
    if (colors && colors.length > 0 && !selectedColor) {
      alert("Please select a color before adding to cart.");
      return;
    }
    const STORAGE_KEY = "101hub-cart";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const lines = raw ? JSON.parse(raw) : [];
      const existing = Array.isArray(lines) ? lines : [];
      const found = existing.find(
        (line: { productId: string; qty: number; size?: string; color?: string }) =>
          line.productId === productId &&
          line.size === (selectedSize || undefined) &&
          line.color === (selectedColor || undefined)
      );
      if (found) {
        found.qty += 1;
      } else {
        existing.push({
          productId,
          qty: 1,
          ...(selectedSize && { size: selectedSize }),
          ...(selectedColor && { color: selectedColor }),
        });
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new Event("101hub:cart-updated"));
      alert("✓ Added to cart!");
    } catch {
      alert("Error adding to cart");
    }
  }

  return (
    <div className="space-y-4">
      {/* Size picker */}
      {sizes && sizes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--ink)]">
            Size <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size === selectedSize ? "" : size)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedSize === size
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-black/20 bg-white text-[var(--ink)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color picker */}
      {colors && colors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--ink)]">
            Color <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color === selectedColor ? "" : color)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedColor === color
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-black/20 bg-white text-[var(--ink)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
