"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";

type VendorProduct = {
  id: string;
  vendor_id: string;
  vendor_name: string;
  name: string;
  description: string;
  price: number;
  category?: string;
  stock?: number;
  image?: string | null;
  images?: string[];
  status: string;
  created_at: string;
};

type CartLine = { productId: string; qty: number };
const STORAGE_KEY = "101hub-cart";

export default function VendorProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<VendorProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/vendor-products`)
      .then((r) => r.json())
      .then((data: { items?: VendorProduct[] }) => {
        const found = (data.items ?? []).find((p) => p.id === id) ?? null;
        setProduct(found);
        if (found?.image) setSelectedImage(found.image);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function addToCart() {
    if (!product) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as CartLine[]) : [];
    const idx = existing.findIndex((l) => l.productId === product.id);
    if (idx >= 0) existing[idx] = { ...existing[idx], qty: existing[idx].qty + 1 };
    else existing.push({ productId: product.id, qty: 1 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new Event("101hub:cart-updated"));
    window.dispatchEvent(new Event("101hub:product-added"));
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (loading) {
    return (
      <div className="panel p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-[var(--ink-soft)]">Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="panel p-6 space-y-4 text-center">
        <p className="text-lg font-bold">Product not found.</p>
        <Link href="/products" className="inline-block rounded-full bg-[var(--brand)] px-6 py-2 text-sm font-bold text-white">
          Back to Products
        </Link>
      </div>
    );
  }

  const allImages = [product.image, ...(product.images ?? [])].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-6">
        <Link href="/products" className="text-xs font-semibold text-[var(--brand)] hover:underline">
          ← Back to Products
        </Link>
      </div>

      <div className="panel p-4 sm:p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Images */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-black/10 bg-[var(--base-light)] aspect-square flex items-center justify-center">
              {selectedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">📦</span>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    onClick={() => setSelectedImage(img)}
                    className={`h-16 w-16 shrink-0 cursor-pointer rounded-lg object-cover border-2 transition ${
                      selectedImage === img ? "border-[var(--brand)]" : "border-black/10"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 mb-2">
                Vendor Product
              </span>
              {product.category && (
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">{product.category}</p>
              )}
              <h1 className="mt-1 text-xl font-black sm:text-2xl">{product.name}</h1>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">by {product.vendor_name}</p>
            </div>

            <p className="text-3xl font-black text-[var(--brand-deep)]">GHS {product.price.toFixed(2)}</p>

            {product.stock !== undefined && (
              <p className="text-sm text-[var(--ink-soft)]">
                {product.stock > 0 ? `${product.stock} in stock` : <span className="text-red-500 font-bold">Out of stock</span>}
              </p>
            )}

            <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line">{product.description}</p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={addToCart}
                disabled={product.stock === 0}
                className="flex-1 rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {added ? "Added to Cart ✓" : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
