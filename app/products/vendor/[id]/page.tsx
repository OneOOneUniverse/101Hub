"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import ProductGallery from "@/components/ProductGallery";
import { copyToClipboard, shareablePlatforms, type ShareOptions } from "@/lib/social-share";

type VendorProduct = {
  id: string;
  vendor_id: string;
  vendor_name: string;
  name: string;
  description: string;
  price: number;
  discount?: number;
  category?: string;
  stock?: number;
  image?: string | null;
  images?: string[];
  videos?: string[];
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
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/public/vendor-products`)
      .then((r) => r.json())
      .then((data: { items?: VendorProduct[] }) => {
        const found = (data.items ?? []).find((p) => p.id === id) ?? null;
        setProduct(found);
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

  function handleShare(platformId: string) {
    if (!product) return;
    const productUrl = `${window.location.origin}/products/vendor/${product.id}`;
    const shareOptions: ShareOptions = {
      url: productUrl,
      title: product.name,
      description: product.description,
      price: `GHS ${product.price.toFixed(2)}`,
    };
    const platform = shareablePlatforms.find((p) => p.id === platformId);
    if (!platform) return;
    window.open(platform.getUrl(shareOptions), "_blank", "width=600,height=400");
    setShareOpen(false);
  }

  async function handleCopyLink() {
    if (!product) return;
    const productUrl = `${window.location.origin}/products/vendor/${product.id}`;
    const ok = await copyToClipboard(productUrl);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
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
          {/* Images & Videos Gallery */}
          <div>
            <ProductGallery
              productName={product.name}
              images={allImages}
              videos={product.videos}
            />
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

            {(() => {
              const discPct = product.discount && product.discount > 0 ? product.discount : 0;
              const saleP = discPct > 0 ? Number((product.price * ((100 - discPct) / 100)).toFixed(2)) : null;
              return (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-3xl font-black text-[var(--brand-deep)]">
                    GHS {(saleP ?? product.price ?? 0).toFixed(2)}
                  </p>
                  {saleP !== null && (
                    <>
                      <p className="text-lg text-[var(--ink-soft)] line-through">GHS {(product.price ?? 0).toFixed(2)}</p>
                      <span className="rounded-full bg-purple-600 px-2 py-0.5 text-xs font-black text-white">-{discPct}%</span>
                    </>
                  )}
                </div>
              );
            })()}

            {product.stock !== undefined && (
              <p className="text-sm text-[var(--ink-soft)]">
                {product.stock > 0 ? `${product.stock} in stock` : <span className="text-red-500 font-bold">Out of stock</span>}
              </p>
            )}

            <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line">{product.description}</p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={product.stock === 0 ? undefined : addToCart}
                disabled={product.stock === 0}
                className={`flex-1 rounded-full px-6 py-3 text-sm font-bold text-white transition ${
                  product.stock === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[var(--brand)] hover:bg-[var(--brand-deep)]"
                }`}
              >
                {product.stock === 0 ? "Add to Waitlist" : added ? "Added to Cart ✓" : "Add to Cart"}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShareOpen((v) => !v)}
                  aria-label="Share product"
                  className="rounded-full border border-black/15 px-4 py-3 text-sm font-bold hover:bg-black/5 transition"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
                {shareOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Share product</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {["whatsapp", "facebook", "twitter", "telegram"].map((pid) => (
                          <button key={pid} type="button" onClick={() => handleShare(pid)}
                            className="rounded-lg border border-black/10 px-2 py-1.5 text-xs font-semibold capitalize hover:bg-black/5 transition">
                            {pid === "twitter" ? "X (Twitter)" : pid.charAt(0).toUpperCase() + pid.slice(1)}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={handleCopyLink}
                        className="mt-2 w-full rounded-lg border border-black/10 px-2 py-1.5 text-xs font-semibold hover:bg-black/5 transition">
                        {copied ? "Link Copied ✓" : "Copy Link"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
