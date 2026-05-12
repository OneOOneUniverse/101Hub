"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCategories } from "@/lib/store-data";
import type { Product } from "@/lib/site-content-types";
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
  emitCartUpdate();
  window.dispatchEvent(new Event("101hub:product-added"));
}

type SortOption = "newest" | "oldest" | "price-asc" | "price-desc" | "name-asc" | "brand-asc";

const PRODUCTS_PER_PAGE = 28;

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const { content, loading, error } = useStoreContent();

  const [query, setQuery] = useState(searchQuery);
  const [category, setCategory] = useState("All");
  const [subCategory, setSubCategory] = useState("All");
  const [addedId, setAddedId] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);
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

  // Get subcategories for the active category (from Category definition + from products)
  const activeSubCategories = useMemo(() => {
    if (category === "All" || category === "New Drops") return [];
    // From category definition
    const catDef = (content?.categories ?? []).find((c) => c.name === category);
    const defined = catDef?.subCategories ?? [];
    // From product data
    const fromProducts = products
      .filter((p) => p.category === category && p.subCategory)
      .map((p) => p.subCategory!);
    // Merge and deduplicate
    return [...new Set([...defined, ...fromProducts])];
  }, [category, content?.categories, products]);

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

  const filtered = useMemo((): Product[] => {
    const term = query.trim().toLowerCase();

    const result = products.filter((item) => {
      // Vendor products are excluded from "New Drops"
      if (category === "New Drops") {
        if (item.badge === "Vendor") return false;
        const isNew = item.dateAdded || item.badge === "New";
        const text = `${item.name} ${item.description}`.toLowerCase();
        const searchMatch = term ? text.includes(term) : true;
        return isNew && searchMatch;
      }

      const categoryMatch = category === "All" || item.category === category;
      const subCategoryMatch = subCategory === "All" || item.subCategory === subCategory;
      const text = `${item.name} ${item.description}`.toLowerCase();
      const searchMatch = term ? text.includes(term) : true;
      return categoryMatch && subCategoryMatch && searchMatch;
    });

    // Sort using dateAdded for all products (vendor products have dateAdded set from created_at)
    result.sort((a, b) => {
      const dateA = a.dateAdded ?? "";
      const dateB = b.dateAdded ?? "";
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "name-asc":
        case "brand-asc":
          return a.name.localeCompare(b.name);
        case "oldest":
          if (dateA && dateB) return new Date(dateA).getTime() - new Date(dateB).getTime();
          if (dateA) return 1;
          if (dateB) return -1;
          return 0;
        case "newest":
        default:
          if (dateA && dateB) return new Date(dateB).getTime() - new Date(dateA).getTime();
          if (dateA) return -1;
          if (dateB) return 1;
          if (a.badge === "New" && b.badge !== "New") return -1;
          if (a.badge !== "New" && b.badge === "New") return 1;
          return 0;
      }
    });

    return result;
  }, [category, subCategory, products, query, sortBy]);

  // Featured products: badge="Featured" first, then newest by dateAdded/rating
  const featuredProducts = useMemo(() => {
    const ids = content?.featuredProductIds ?? [];
    if (ids.length > 0) {
      const map = new Map(products.map((p) => [p.id, p]));
      const pinned = ids.map((id) => map.get(id)).filter(Boolean) as Product[];
      if (pinned.length > 0) return pinned.slice(0, 10);
    }
    // Fallback: include any products with "Featured" badge, then fill with newest
    const badgeFeatured = products.filter((p) => p.badge === "Featured");
    if (badgeFeatured.length >= 4) return badgeFeatured.slice(0, 10);
    const sorted = [...products].sort((a, b) => {
      if (a.dateAdded && b.dateAdded) return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      if (a.dateAdded) return -1;
      if (b.dateAdded) return 1;
      return b.rating - a.rating;
    });
    return sorted.slice(0, 10);
  }, [products, content?.featuredProductIds]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, subCategory, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = filtered.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const enabledStores = useMemo(
    () =>
      content?.features.dealsHub && content.dealsHub?.enabled
        ? (content.dealsHub.specialStores ?? []).filter((s) => s.enabled)
        : [],
    [content]
  );

  function goToPage(page: number) {
    setCurrentPage(page);
    document.getElementById("products-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getPageNumbers(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

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
          backgroundImage={content.flashSale.backgroundImage}
          backgroundVideo={content.flashSale.backgroundVideo}
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
              onClick={() => { setCategory("All"); setSubCategory("All"); }}
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
                onClick={() => { setCategory(cat.name); setSubCategory("All"); }}
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

        {/* Subcategory pills — shown when a category with subcategories is selected */}
        {activeSubCategories.length > 0 && (
          <div className="mt-3 -mx-4 overflow-x-auto sm:-mx-6 md:-mx-8">
            <div className="flex items-center gap-2 px-4 pb-1 sm:px-6 md:px-8" style={{ minWidth: 'max-content' }}>
              <span className="text-xs font-bold text-[var(--ink-soft)] mr-1 shrink-0">Sub:</span>
              <button
                type="button"
                onClick={() => setSubCategory("All")}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all duration-200 ${
                  subCategory === "All"
                    ? "bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/25"
                    : "bg-black/5 text-[var(--ink-soft)] hover:bg-black/10"
                }`}
              >
                All
              </button>
              {activeSubCategories.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubCategory(sub)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all duration-200 ${
                    subCategory === sub
                      ? "bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/25"
                      : "bg-black/5 text-[var(--ink-soft)] hover:bg-black/10"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-3 flex-col sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-full border-2 border-[rgba(255,107,53,0.18)] bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:font-medium placeholder:text-[rgba(23,32,38,0.38)] focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)]"
            />
          </div>
          <div className="relative sm:w-52">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="w-full appearance-none rounded-full border-2 border-[rgba(255,107,53,0.18)] bg-white py-2.5 pl-4 pr-9 text-sm font-semibold outline-none transition-all cursor-pointer focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="brand-asc">Brand (A–Z)</option>
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="panel overflow-hidden p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black sm:text-xl">Featured Products</h2>
              <p className="text-xs text-[var(--ink-soft)] sm:text-sm">Hand-picked top picks just for you</p>
            </div>
            <button
              type="button"
              onClick={() => { setCategory("All"); setSubCategory("All"); document.getElementById("products-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              className="shrink-0 rounded-full border border-[var(--brand)] px-4 py-1.5 text-xs font-bold text-[var(--brand-deep)] transition-all hover:bg-[var(--brand)]/10 active:scale-95"
            >
              View All
            </button>
          </div>
          <div className="-mx-4 overflow-x-auto sm:-mx-6">
            <div className="flex gap-3 px-4 pb-2 sm:px-6" style={{ minWidth: "max-content" }}>
              {featuredProducts.map((item) => {
                const hasDiscount = item.discount && item.discount > 0;
                const isFlash = !hasDiscount && content.features.flashSale && content.flashSale.featuredProductIds.includes(item.id);
                const discountPct = hasDiscount ? item.discount! : isFlash ? content.flashSale.discountPercentage : 0;
                const salePrice = discountPct > 0 ? Number((item.price * ((100 - discountPct) / 100)).toFixed(2)) : item.price;
                const featuredHref = item.badge === "Vendor"
                  ? `/products/vendor/${item.id}`
                  : `/products/${item.slug}`;
                return (
                  <Link
                    key={item.id}
                    href={featuredHref}
                    className="group relative flex w-36 shrink-0 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-44"
                  >
                    {discountPct > 0 && (
                      <span className="absolute left-2 top-2 z-10 rounded-lg bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white leading-none">
                        -{discountPct}%
                      </span>
                    )}
                    {item.badge && item.badge !== "Featured" && (
                      <span className="absolute right-2 top-2 z-10 rounded-lg bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-black text-white leading-none">
                        {item.badge}
                      </span>
                    )}
                    <div className="aspect-square w-full overflow-hidden bg-[var(--surface)]">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full" style={{ background: "linear-gradient(135deg,#f3f4f6,#e5e7eb)" }} />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">{item.category}</p>
                      <h3 className="line-clamp-2 text-xs font-black leading-tight text-[var(--ink)] sm:text-sm">{item.name}</h3>
                      <div className="mt-auto flex items-baseline gap-1.5 pt-1">
                        <span className="text-sm font-black text-[var(--brand-deep)] sm:text-base">GHS {salePrice.toFixed(2)}</span>
                        {discountPct > 0 && (
                          <span className="text-[10px] text-[var(--ink-soft)] line-through">GHS {item.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section id="products-grid" className="grid grid-cols-2 items-start gap-3 sm:gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {paginatedProducts.flatMap((item, index) => {
          // ── Vendor product card ──────────────────────────────────
          if (item.badge === "Vendor") {
            const vIsSoldOut = (item.stock ?? 0) === 0;
            const vDiscountPct = item.discount && item.discount > 0 ? item.discount : 0;
            const vSalePrice = vDiscountPct > 0 ? Number((item.price * ((100 - vDiscountPct) / 100)).toFixed(2)) : item.price;
            const card = (
              <article key={item.id} className={`product-card${vIsSoldOut ? " opacity-60 grayscale-[40%]" : ""}`}>
                <div className="product-card__shine" />
                <div className="product-card__glow" />
                <div className="product-card__content">
                  {/* Discount badge + sold-out badge */}
                  {vIsSoldOut ? (
                    <span className="absolute left-2 top-2 z-10 rounded-lg bg-gray-700 px-1.5 py-0.5 text-[10px] font-black text-white leading-none">
                      Sold Out
                    </span>
                  ) : vDiscountPct > 0 ? (
                    <span className="absolute left-2 top-2 z-10 rounded-lg bg-purple-600 px-1.5 py-0.5 text-[10px] font-black text-white leading-none">
                      -{vDiscountPct}%
                    </span>
                  ) : null}
                  {item.image ? (
                    <div className="product-card__img-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.name} className="product-card__img" />
                    </div>
                  ) : (
                    <div className="product-card__image" aria-hidden="true" />
                  )}
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)] sm:text-xs md:text-[11px]">
                      {item.category ?? "Vendor"}
                    </p>
                  </div>
                  <h2 className="text-xs font-black leading-tight product-card__title sm:text-sm md:text-base">
                    <Link href={`/products/vendor/${item.id}`}>{item.name}</Link>
                  </h2>
                  {item.vendorName && (
                    <p className="text-[10px] font-bold text-purple-600 sm:text-xs">by {item.vendorName}</p>
                  )}
                  <div className="flex items-end justify-between gap-1">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-sm font-black leading-none sm:text-base product-card__price">
                          GHS {vSalePrice.toFixed(2)}
                        </p>
                        {vDiscountPct > 0 && (
                          <p className="text-[10px] text-[var(--ink-soft)] line-through sm:text-xs">
                            GHS {(item.price ?? 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    {item.stock !== undefined && !vIsSoldOut && (
                      <p className="text-[10px] text-[var(--ink-soft)] sm:text-xs">Qty: {item.stock}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                    {vIsSoldOut ? (
                      <button
                        disabled
                        className="product-card__action rounded-full bg-gray-400 px-2 py-1.5 text-[11px] font-bold text-white cursor-not-allowed sm:px-4 sm:py-2 sm:text-sm"
                      >
                        Add to Waitlist
                      </button>
                    ) : content.features.cart ? (
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
                      href={`/products/vendor/${item.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--brand)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 sm:hidden"
                    >
                      View
                    </Link>
                    <Link
                      href={`/products/vendor/${item.id}`}
                      className="hidden rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 sm:inline-flex"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </article>
            );
            if (enabledStores.length > 0 && (index + 1) % 4 === 0 && index < paginatedProducts.length - 1) {
              const bannerIndex = Math.floor(index / 4);
              if (bannerIndex >= enabledStores.length) return [card];
              const bannerStore = enabledStores[bannerIndex];
              return [card, (
                <Link
                  key={`store-banner-${index}`}
                  href={`/deals/store/${bannerStore.slug}`}
                  className="col-span-full flex items-center justify-between gap-3 rounded-xl overflow-hidden px-4 h-14 transition-opacity hover:opacity-90"
                  style={
                    bannerStore.backgroundImage
                      ? { backgroundImage: `url('${bannerStore.backgroundImage}')`, backgroundSize: "cover", backgroundPosition: "center" }
                      : { background: `linear-gradient(135deg, ${bannerStore.bgColor}, ${bannerStore.bgColor}cc)` }
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{bannerStore.emoji}</span>
                    <div>
                      <p className="text-xs font-black leading-none" style={{ color: bannerStore.backgroundImage ? "#fff" : bannerStore.textColor }}>
                        {bannerStore.name}
                      </p>
                      {bannerStore.description && (
                        <p className="hidden sm:block text-[10px] opacity-75 leading-tight mt-0.5" style={{ color: bannerStore.backgroundImage ? "#fff" : bannerStore.textColor }}>
                          {bannerStore.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-bold" style={{ color: bannerStore.backgroundImage ? "#fff" : bannerStore.textColor }}>
                      Shop Now
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: bannerStore.backgroundImage ? "#fff" : bannerStore.textColor }}>
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Link>
              )];
            }
            return [card];
          }

          // ── Store product card ───────────────────────────────────
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
          const isSoldOut = item.stock === 0;

          const card = (
            <article key={item.id} className={`product-card${isSoldOut ? " opacity-60 grayscale-[40%]" : ""}`}>
              <div className="product-card__shine" />
              <div className="product-card__glow" />
              <div className="product-card__content">
                {/* Show sold-out or discount badge */}
                {isSoldOut ? (
                  <div className="absolute inset-x-3 top-3 z-10">
                    <div className="flex items-end justify-between gap-2">
                      <p className="rounded-lg px-2 py-1 text-[10px] font-black text-white bg-gray-700">
                        Sold Out
                      </p>
                      {item.badge ? (
                        <p className="product-card__badge">{item.badge}</p>
                      ) : null}
                    </div>
                  </div>
                ) : isOnSale ? (
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
                      {isOnSale && (
                        <p className="text-[10px] text-[var(--ink-soft)] line-through sm:text-xs">
                          GHS {item.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    {isOnSale && (
                      <p className="text-[10px] font-bold text-green-700 sm:text-xs">
                        Save GHS {savings.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {!isSoldOut && <p className="text-[10px] text-[var(--ink-soft)] sm:text-xs">Qty: {item.stock}</p>}
                    {content.features.reviews ? (
                      <p className="text-[10px] text-[var(--ink-soft)] sm:text-xs">
                        ★ {((reviewSummaryByProduct[item.id]?.average ?? item.rating)).toFixed(1)}
                        <span className="hidden sm:inline"> ({reviewSummaryByProduct[item.id]?.count ?? 0})</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                  {isSoldOut ? (
                    <button
                      disabled
                      className="product-card__action rounded-full bg-gray-400 px-2 py-1.5 text-[11px] font-bold text-white cursor-not-allowed sm:px-4 sm:py-2 sm:text-sm"
                    >
                      Add to Waitlist
                    </button>
                  ) : content.features.cart ? (
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

          if (enabledStores.length > 0 && (index + 1) % 4 === 0 && index < paginatedProducts.length - 1) {
            const bannerIndex = Math.floor(index / 4);
            // Only show each store once; stop inserting after all stores have been shown
            if (bannerIndex >= enabledStores.length) return [card];
            const bannerStore = enabledStores[bannerIndex];
            return [card, (
              <Link
                key={`store-banner-${index}`}
                href={`/deals/store/${bannerStore.slug}`}
                className="col-span-full flex items-center justify-between gap-3 rounded-xl overflow-hidden px-4 h-14 transition-opacity hover:opacity-90"
                style={
                  bannerStore.backgroundImage
                    ? { backgroundImage: `url('${bannerStore.backgroundImage}')`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { background: `linear-gradient(135deg, ${bannerStore.bgColor}, ${bannerStore.bgColor}cc)` }
                }
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{bannerStore.emoji}</span>
                  <div>
                    <p className="text-xs font-black leading-none" style={{ color: bannerStore.backgroundImage ? "#fff" : bannerStore.textColor }}>
                      {bannerStore.name}
                    </p>
                    {bannerStore.description && (
                      <p className="hidden sm:block text-[10px] opacity-75 leading-tight mt-0.5" style={{ color: bannerStore.backgroundImage ? "#fff" : bannerStore.textColor }}>
                        {bannerStore.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-bold" style={{ color: bannerStore.backgroundImage ? "#fff" : bannerStore.textColor }}>
                    Shop Now
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: bannerStore.backgroundImage ? "#fff" : bannerStore.textColor }}>
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            )];
          }
          return [card];
        })}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1.5 py-4 sm:gap-2" aria-label="Products pagination">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold text-[var(--ink)] shadow-sm hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            ‹
          </button>

          {getPageNumbers().map((page, idx) =>
            page === "..." ? (
              <span key={`dots-${idx}`} className="px-1.5 text-sm text-[var(--ink-soft)]">…</span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={`min-w-[2.25rem] rounded-lg px-2.5 py-2 text-sm font-bold shadow-sm ${
                  page === currentPage
                    ? "bg-[var(--brand)] text-white"
                    : "border border-black/10 bg-white text-[var(--ink)] hover:bg-[var(--surface)]"
                }`}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold text-[var(--ink)] shadow-sm hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            ›
          </button>
        </nav>
      )}

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
