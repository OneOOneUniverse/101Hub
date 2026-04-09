"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCategories } from "@/lib/store-data";
import { productCategories } from "@/lib/site-content-types";
import { useStoreContent } from "@/lib/use-store-content";
import WishlistButton from "@/components/WishlistButton";
import PromoSlider from "@/components/PromoSlider";
import FlashSaleTimer from "@/components/FlashSaleTimer";
import { getReviewStats } from "@/lib/product-feedback";
import { emitCartUpdate } from "@/lib/use-cart-count";

type CartLine = { productId: string; qty: number };

const STORAGE_KEY = "101hub-cart";

function addToCart(productId: string) {
  const raw = localStorage.getItem(STORAGE_KEY);
  const existing = raw ? ((JSON.parse(raw) as CartLine[]) || []) : [];
  const idx = existing.findIndex((line) => line.productId === productId);

  if (idx >= 0) {
    existing[idx] = { ...existing[idx], qty: existing[idx].qty + 1 };
  } else {
    existing.push({ productId, qty: 1 });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  
  // Emit events for cart updates
  emitCartUpdate();
  window.dispatchEvent(new Event("101hub:product-added"));
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const { content, loading, error } = useStoreContent();

  const [query, setQuery] = useState(searchQuery);
  const [category, setCategory] = useState("All");
  const [addedId, setAddedId] = useState("");
  const [reviewSummaryByProduct, setReviewSummaryByProduct] = useState<
    Record<string, { average: number; count: number }>
  >({});

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const products = useMemo(() => content?.products ?? [], [content?.products]);

  useEffect(() => {
    const syncReviewSummaries = () => {
      const next: Record<string, { average: number; count: number }> = {};

      for (const product of products) {
        next[product.id] = getReviewStats(product.id, product.rating);
      }

      setReviewSummaryByProduct(next);
    };

    syncReviewSummaries();
    window.addEventListener("101hub:reviews-updated", syncReviewSummaries);
    window.addEventListener("storage", syncReviewSummaries);

    return () => {
      window.removeEventListener("101hub:reviews-updated", syncReviewSummaries);
      window.removeEventListener("storage", syncReviewSummaries);
    };
  }, [products]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    let result = products.filter((item) => {
      // Handle "New Drops" special category
      if (category === "New Drops") {
        // Show products with dateAdded or products with "New" badge
        const isNew = item.dateAdded || item.badge === "New";
        const text = `${item.name} ${item.description}`.toLowerCase();
        const searchMatch = term ? text.includes(term) : true;
        return isNew && searchMatch;
      }

      const categoryMatch = category === "All" || item.category === category;
      const text = `${item.name} ${item.description}`.toLowerCase();
      const searchMatch = term ? text.includes(term) : true;
      return categoryMatch && searchMatch;
    });

    // Sort by dateAdded (newest first), then by badge priority
    result.sort((a, b) => {
      // Products with dateAdded come first (sorted newest first)
      if (a.dateAdded && b.dateAdded) {
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }
      if (a.dateAdded) return -1;
      if (b.dateAdded) return 1;

      // Then items with "New" badge
      if (a.badge === "New" && b.badge !== "New") return -1;
      if (a.badge !== "New" && b.badge === "New") return 1;

      return 0;
    });

    return result;
  }, [category, products, query]);

  if (loading) {
    return (
      <section className="panel p-6">
        <h1 className="text-3xl font-black">Products</h1>
        <p className="mt-2 text-[var(--ink-soft)]">Loading products...</p>
      </section>
    );
  }

  if (error || !content) {
    return (
      <section className="panel p-6">
        <h1 className="text-3xl font-black">Products</h1>
        <p className="mt-2 text-red-600">{error || "Could not load products."}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {content.features.promoSlider ? <PromoSlider slides={content.promoSlides} /> : null}
      {content.features.flashSale ? (
        <FlashSaleTimer
          key={`${content.flashSale.durationHours}-${content.flashSale.endsAt ?? "none"}-${content.updatedAt}-products`}
          durationHours={content.flashSale.durationHours}
          endsAt={content.flashSale.endsAt}
          eyebrow={content.flashSale.bannerEyebrow}
          title={content.flashSale.bannerTitle}
          description={content.flashSale.bannerDescription}
        />
      ) : null}
      <section className="panel p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl font-black sm:text-3xl">Products</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">
          Browse gadgets and add items to your cart.
        </p>

        {/* Horizontal category filter */}
        <div className="-mx-4 mt-4 overflow-x-auto sm:-mx-6 md:-mx-8">
          <div className="flex gap-2 px-4 pb-1 sm:flex-wrap sm:px-6 md:px-8">
            {(["All", ...productCategories] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
                  category === cat
                    ? "bg-[var(--brand)] text-white"
                    : "border border-[var(--brand)]/40 text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 items-start gap-3 sm:gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item) => (
          <article key={item.id} className="product-card">
            <div className="product-card__shine" />
            <div className="product-card__glow" />
            <div className="product-card__content">
              {item.badge ? <p className="product-card__badge">{item.badge}</p> : null}
              {item.image ? (
                <div
                  className="h-24 overflow-hidden rounded-lg border border-black/10 bg-cover bg-center sm:h-32 md:h-40"
                  style={{ backgroundImage: `url('${item.image}')` }}
                  role="img"
                  aria-label={`${item.name} image`}
                >
                  <span className="sr-only">{item.name} image</span>
                </div>
              ) : (
                <div className="product-card__image" aria-hidden="true" />
              )}
              {content.features.wishlist ? (
                <div className="mt-1 flex justify-end sm:mt-2">
                  <span className="sm:hidden">
                    <WishlistButton productId={item.id} iconOnly />
                  </span>
                  <span className="hidden sm:inline-flex">
                    <WishlistButton productId={item.id} compact />
                  </span>
                </div>
              ) : null}

              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)] sm:text-xs md:text-[11px]">
                {item.category}
              </p>
              <h2 className="text-xs font-black leading-tight product-card__title sm:text-sm md:text-base">
                <Link href={`/products/${item.slug}`}>{item.name}</Link>
              </h2>

              <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2 sm:mt-4">
                <p className="text-sm font-black leading-none product-card__price sm:text-lg">
                  GHS {item.price.toFixed(2)}
                </p>
                <div className="text-right">
                  <p className="text-[10px] text-[var(--ink-soft)] sm:text-sm">Stock: {item.stock}</p>
                  {content.features.reviews ? (
                    <p className="text-[10px] text-[var(--ink-soft)] sm:text-sm">
                      Rating {((reviewSummaryByProduct[item.id]?.average ?? item.rating)).toFixed(1)} / 5
                    </p>
                  ) : null}
                </div>
              </div>
              {content.features.reviews ? (
                <p className="hidden text-[10px] text-[var(--ink-soft)] sm:block sm:text-xs">
                  {reviewSummaryByProduct[item.id]?.count ?? 0} user reviews
                </p>
              ) : null}

              <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5 sm:mt-4 sm:flex sm:flex-wrap sm:gap-2">
                {content.features.cart ? (
                  <button
                    onClick={() => {
                      addToCart(item.id);
                      setAddedId(item.id);
                      setTimeout(() => setAddedId(""), 1200);
                    }}
                    className="product-card__action rounded-full bg-[var(--brand)] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[var(--brand-deep)] sm:px-4 sm:py-2 sm:text-sm"
                  >
                    {addedId === item.id ? "Added" : "Add to Cart"}
                  </button>
                ) : null}
                <Link
                  href={`/products/${item.slug}`}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--brand)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 sm:hidden"
                >
                  View
                </Link>
                <Link
                  href={`/products/${item.slug}`}
                  className="hidden rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 sm:inline-flex"
                >
                  View Details
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <section className="panel p-6">
          <h1 className="text-3xl font-black">Products</h1>
          <p className="mt-2 text-[var(--ink-soft)]">Loading products...</p>
        </section>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
