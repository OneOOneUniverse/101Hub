"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCategories } from "@/lib/store-data";
import { defaultProductCategories, getProductCategories } from "@/lib/site-content-types";
import { useStoreContent } from "@/lib/use-store-content";
import WishlistButton from "@/components/WishlistButton";
import ProductCardShare from "@/components/ProductCardShare";
import PromoSlider from "@/components/PromoSlider";
import FlashSaleTimer from "@/components/FlashSaleTimer";
import BlackFridayBanner from "@/components/BlackFridayBanner";
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

type SortOption = "newest" | "oldest" | "price-asc" | "price-desc" | "name-asc" | "brand-asc";

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const { content, loading, error } = useStoreContent();

  const [query, setQuery] = useState(searchQuery);
  const [category, setCategory] = useState("All");
  const [addedId, setAddedId] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [reviewSummaryByProduct, setReviewSummaryByProduct] = useState<
    Record<string, { average: number; count: number }>
  >({});

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const products = useMemo(() => content?.products ?? [], [content?.products]);
  const dynamicCategories = useMemo(() => {
    if (!content?.categories) return defaultProductCategories;
    return getProductCategories(content.categories);
  }, [content?.categories]);

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

    // Apply sorting based on sortBy state
    result.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "brand-asc":
          // Assuming brand is stored in a field, using name as brand proxy
          return a.name.localeCompare(b.name);
        case "oldest":
          // Sort by dateAdded oldest first
          if (a.dateAdded && b.dateAdded) {
            return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          }
          if (a.dateAdded) return 1;
          if (b.dateAdded) return -1;
          return 0;
        case "newest":
        default:
          // Sort by dateAdded newest first
          if (a.dateAdded && b.dateAdded) {
            return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
          }
          if (a.dateAdded) return -1;
          if (b.dateAdded) return 1;

          // Then items with "New" badge
          if (a.badge === "New" && b.badge !== "New") return -1;
          if (a.badge !== "New" && b.badge === "New") return 1;

          return 0;
      }
    });

    return result;
  }, [category, products, query, sortBy]);

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
      {content.features.blackFriday ? (
        <BlackFridayBanner content={content.blackFriday} />
      ) : null}
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

        {/* Category cards — Browse by Category */}
        <div className="mt-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--ink-soft)]">Browse by Category</h2>
          <div className="-mx-4 overflow-x-auto sm:-mx-6 md:-mx-8">
          <div className="flex gap-3 px-4 pb-2 sm:px-6 md:px-8" style={{ minWidth: 'max-content' }}>
            {/* "All" card */}
            <button
              type="button"
              onClick={() => setCategory("All")}
              className={`category-card shrink-0${category === "All" ? " category-card--active" : ""}`}
            >
              <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a', ...(content.allCategoryImage ? { backgroundImage: `url('${content.allCategoryImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) }} />
              <div className="category-card__overlay">
                <div className="category-card__text">
                  <span className="category-card__name">All</span>
                </div>
                <div className="category-card__arrow">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" className="w-4 h-4" fill="none">
                    <path d="M4.646 2.146a.5.5 0 0 0 0 .708L7.793 6L4.646 9.146a.5.5 0 1 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </button>

            {/* Dynamic category cards */}
            {(content.categories ?? []).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.name)}
                className={`category-card shrink-0${category === cat.name ? " category-card--active" : ""}`}
              >
                <div style={{
                  position: 'absolute', inset: 0, background: '#1a1a1a',
                  ...(cat.image ? { backgroundImage: `url('${cat.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
                }} />
                {!cat.image && (
                  <div className="category-card__spinner-wrap">
                    <div className="category-card__spinner" />
                  </div>
                )}
                <div className="category-card__overlay">
                  <div className="category-card__text">
                    <span className="category-card__name">{cat.name}</span>
                  </div>
                  <div className="category-card__arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" className="w-4 h-4" fill="none">
                      <path d="M4.646 2.146a.5.5 0 0 0 0 .708L7.793 6L4.646 9.146a.5.5 0 1 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="mt-3 flex gap-3 flex-col sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm bg-white cursor-pointer"
          >
            <option value="newest">Date Added (Newest)</option>
            <option value="oldest">Date Added (Oldest)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="brand-asc">Brand (A-Z)</option>
          </select>
        </div>
      </section>

      <section className="grid grid-cols-2 items-start gap-2 sm:gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item) => {
          // Product-specific discount takes priority
          const hasProductDiscount = item.discount && item.discount > 0;
          const discountPercent = hasProductDiscount ? item.discount : 0;
          
          // Check if product is in flash sale (but only if no product-specific discount)
          const isFlashSale = !hasProductDiscount && content.features.flashSale && content.flashSale.featuredProductIds.includes(item.id);
          const flashSalePercent = isFlashSale ? content.flashSale.discountPercentage : 0;
          
          // Determine which discount to show
          const totalDiscount = discountPercent || flashSalePercent;
          const salePrice = totalDiscount > 0
            ? Number((item.price * ((100 - totalDiscount) / 100)).toFixed(2))
            : item.price;
          const displayPrice = salePrice;
          const savings = item.price - salePrice;
          const isOnSale = totalDiscount > 0;
          const discountSource = hasProductDiscount ? "product" : isFlashSale ? "flash" : null;

          return (
            <article key={item.id} className="product-card">
              <div className="product-card__shine" />
              <div className="product-card__glow" />
              <div className="product-card__content">
                {/* Show discount badge if on sale */}
                {isOnSale ? (
                  <div className="absolute inset-x-3 top-3 z-10">
                    <div className="flex items-end justify-between gap-2">
                      <p className={`rounded-lg px-2 py-1 text-[10px] font-black text-white ${hasProductDiscount ? "bg-purple-600" : "bg-red-600"}`}>
                        -{totalDiscount}%
                      </p>
                      {item.badge ? (
                        <p className="product-card__badge">{item.badge}</p>
                      ) : null}
                    </div>
                  </div>
                ) : item.badge ? (
                  <p className="product-card__badge">{item.badge}</p>
                ) : null}

                {item.image ? (
                  <div className="product-card__img-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="product-card__img"
                    />
                  </div>
                ) : (
                  <div className="product-card__image" aria-hidden="true" />
                )}

                {/* Category + wishlist/share on same row */}
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)] sm:text-xs md:text-[11px]">
                    {item.category}
                  </p>
                  {content.features.wishlist ? (
                    <div className="flex shrink-0 gap-0.5 sm:gap-1">
                      <span className="sm:hidden">
                        <ProductCardShare
                          productName={item.name}
                          productDescription={`${item.name} - GHS ${displayPrice.toFixed(2)}`}
                          slug={item.slug}
                          iconOnly
                          price={item.price}
                          salePrice={displayPrice}
                          discount={totalDiscount}
                        />
                      </span>
                      <span className="hidden sm:inline-flex">
                        <ProductCardShare
                          productName={item.name}
                          productDescription={`${item.name} - GHS ${displayPrice.toFixed(2)}`}
                          slug={item.slug}
                          compact
                          price={item.price}
                          salePrice={displayPrice}
                          discount={totalDiscount}
                        />
                      </span>
                      <span className="sm:hidden">
                        <WishlistButton productId={item.id} iconOnly />
                      </span>
                      <span className="hidden sm:inline-flex">
                        <WishlistButton productId={item.id} compact />
                      </span>
                    </div>
                  ) : null}
                </div>

                <h2 className="text-xs font-black leading-tight product-card__title sm:text-sm md:text-base">
                  <Link href={`/products/${item.slug}`}>{item.name}</Link>
                </h2>

                {/* Price + stock/rating on same row */}
                <div className="flex items-end justify-between gap-1">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <p className={`text-sm font-black leading-none sm:text-base ${isFlashSale ? "text-red-600" : "product-card__price"}`}>
                        GHS {displayPrice.toFixed(2)}
                      </p>
                      {isFlashSale && (
                        <p className="text-[10px] text-[var(--ink-soft)] line-through sm:text-xs">
                          GHS {item.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    {isFlashSale && (
                      <p className="text-[10px] font-bold text-green-700 sm:text-xs">
                        Save GHS {savings.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-[var(--ink-soft)] sm:text-xs">Qty: {item.stock}</p>
                    {content.features.reviews ? (
                      <p className="text-[10px] text-[var(--ink-soft)] sm:text-xs">
                        ★ {((reviewSummaryByProduct[item.id]?.average ?? item.rating)).toFixed(1)}
                        <span className="hidden sm:inline"> ({reviewSummaryByProduct[item.id]?.count ?? 0})</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
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
          );
        })}
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
