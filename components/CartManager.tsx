"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { useStoreContent } from "@/lib/use-store-content";
import { readWishlist } from "@/lib/product-feedback";
import { getRelatedProducts } from "@/lib/store-data";
import WishlistButton from "@/components/WishlistButton";

type CartLine = { productId: string; qty: number };

type ActiveReward = {
  id: number;
  tierName: string;
  discountPercent: number;
  freeShipping: boolean;
};

const STORAGE_KEY = "101hub-cart";
const REWARD_APPLIED_KEY = "101hub-reward-applied";

function readCart(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(lines: CartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  // Emit event so cart badge updates
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("101hub:cart-updated"));
  }
}

export default function CartManager() {
  const { content, loading, error } = useStoreContent();
  const [lines, setLines] = useState<CartLine[]>(() => readCart());
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [activeReward, setActiveReward] = useState<ActiveReward | null>(null);
  const [rewardApplied, setRewardApplied] = useState(false);
  const products = useMemo(() => content?.products ?? [], [content?.products]);

  useEffect(() => {
    const sync = () => setWishlistIds(readWishlist());
    sync();

    window.addEventListener("101hub:wishlist-updated", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("101hub:wishlist-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Fetch active reward
  useEffect(() => {
    fetch("/api/referral/active-reward")
      .then((r) => r.json())
      .then((d) => {
        if (d.hasReward) setActiveReward(d.reward);
      })
      .catch(() => {});

    // Check if reward was previously applied
    try {
      const applied = localStorage.getItem(REWARD_APPLIED_KEY);
      if (applied) setRewardApplied(true);
    } catch {}
  }, []);

  const toggleReward = useCallback(() => {
    setRewardApplied((prev) => {
      const next = !prev;
      if (next) {
        localStorage.setItem(REWARD_APPLIED_KEY, "true");
      } else {
        localStorage.removeItem(REWARD_APPLIED_KEY);
      }
      window.dispatchEvent(new Event("101hub:reward-updated"));
      return next;
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setLines((prev) => {
      const next = prev
        .map((line) => (line.productId === productId ? { ...line, qty } : line))
        .filter((line) => line.qty > 0);
      writeCart(next);
      return next;
    });
  }, []);

  const removeLine = useCallback((productId: string) => {
    setLines((prev) => {
      const next = prev.filter((line) => line.productId !== productId);
      writeCart(next);
      return next;
    });
  }, []);

  const details = useMemo(() => {
    const resolved = lines
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        if (!product) return null;
        return { product, qty: line.qty, lineTotal: line.qty * product.price };
      })
      .filter(
        (item): item is { product: (typeof products)[number]; qty: number; lineTotal: number } =>
          item !== null
      );

    const subtotal = resolved.reduce((sum, item) => sum + item.lineTotal, 0);
    const delivery = subtotal > 250 ? 0 : subtotal > 0 ? 12 : 0;

    return {
      items: resolved,
      subtotal,
      delivery,
      total: subtotal + delivery,
    };
  }, [lines, products]);

  const suggestedProducts = useMemo(() => {
    const cartProductIds = new Set(lines.map((line) => line.productId));
    
    // First, get wishlist items not in cart
    const wishlistNotInCart = products.filter(
      (p) => wishlistIds.includes(p.id) && !cartProductIds.has(p.id)
    );

    // Then, get related products from cart items
    const relatedFromCart: typeof products | any = [];
    const addedRelated = new Set(wishlistNotInCart.map((p) => p.id));

    details.items.forEach((item) => {
      const related = getRelatedProducts(products, item.product.slug, 4);
      related.forEach((p) => {
        if (!cartProductIds.has(p.id) && !addedRelated.has(p.id)) {
          relatedFromCart.push(p);
          addedRelated.add(p.id);
        }
      });
    });

    // Combine and limit to 6 suggestions
    return [...wishlistNotInCart, ...relatedFromCart].slice(0, 6);
  }, [lines, products, wishlistIds, details.items]);

  if (loading) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Shopping Cart</h1>
        <p className="mt-2 text-xs text-[var(--ink-soft)] sm:text-sm">Loading cart data...</p>
      </section>
    );
  }

  if (error || !content) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Shopping Cart</h1>
        <p className="mt-2 text-xs text-red-600 sm:text-sm">{error || "Could not load cart data."}</p>
      </section>
    );
  }

  if (!content.features.cart) {
    return (
      <FeatureUnavailable
        title="Cart Unavailable"
        description="The cart feature is currently turned off from the admin panel."
        actionHref="/products"
        actionLabel="Browse Products"
      />
    );
  }

  if (!details.items.length) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Your Cart Is Empty</h1>
        <p className="mt-2 text-xs text-[var(--ink-soft)] sm:text-sm">
          Add gadgets from the products page to continue.
        </p>
        <Link
          href="/products"
          className="mt-3 sm:mt-4 inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)] sm:px-5 sm:py-2.5 sm:text-sm"
        >
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <>
    <div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-[1.4fr_1fr]">
      <section className="panel p-4 sm:p-6">
        <h1 className="text-xl font-black sm:text-2xl">Shopping Cart</h1>
        <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-4">
          {details.items.map((item) => (
            <article
              key={item.product.id}
              className="rounded-lg border border-black/10 bg-white p-3 sm:p-4"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--ink-soft)] sm:text-sm">{item.product.category}</p>
                  <h2 className="text-sm font-bold sm:text-lg">{item.product.name}</h2>
                  <p className="text-xs text-[var(--ink-soft)] sm:text-sm">GHS {item.product.price.toFixed(2)} each</p>
                </div>
                <button
                  onClick={() => removeLine(item.product.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 flex-shrink-0 sm:text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <label htmlFor={`qty-${item.product.id}`} className="text-xs text-[var(--ink-soft)] sm:text-sm">
                  Qty
                </label>
                <input
                  id={`qty-${item.product.id}`}
                  type="number"
                  min={1}
                  max={item.product.stock}
                  value={item.qty}
                  onChange={(event) =>
                    updateQty(item.product.id, Number(event.target.value || 1))
                  }
                  className="w-16 rounded-lg border border-black/15 px-2 py-1.5 text-sm sm:w-20 sm:px-3 sm:py-2"
                />
                <p className="ml-auto font-bold text-sm sm:text-base">GHS {item.lineTotal.toFixed(2)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="panel p-4 sm:p-6">
        <h2 className="text-lg font-black sm:text-xl">Summary</h2>

        {/* Reward application toggle */}
        {activeReward && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">✨</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-900 truncate">
                    {activeReward.tierName} Reward
                  </p>
                  <p className="text-xs text-emerald-700">
                    {activeReward.discountPercent}% off
                    {activeReward.freeShipping ? " + Free Shipping" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleReward}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  rewardApplied
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {rewardApplied ? "Remove" : "Apply"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 sm:mt-4 space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--ink-soft)]">Subtotal</span>
            <span className="font-semibold">GHS {details.subtotal.toFixed(2)}</span>
          </div>
          {rewardApplied && activeReward && (
            <div className="flex items-center justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                <span>✨</span> {activeReward.tierName} ({activeReward.discountPercent}% off)
              </span>
              <span className="font-semibold">
                −GHS {(details.subtotal * activeReward.discountPercent / 100).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[var(--ink-soft)]">Delivery</span>
            <span className="font-semibold">
              {rewardApplied && activeReward?.freeShipping
                ? "Free ✨"
                : details.delivery === 0
                ? "Free"
                : `GHS ${details.delivery.toFixed(2)}`}
            </span>
          </div>
          <div className="mt-3 border-t border-black/10 pt-3">
            <div className="flex items-center justify-between text-sm sm:text-base">
              <span className="font-bold">Total</span>
              <span className="font-black">
                GHS {(
                  rewardApplied && activeReward
                    ? details.subtotal * (1 - activeReward.discountPercent / 100) +
                      (activeReward.freeShipping ? 0 : details.delivery)
                    : details.total
                ).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/checkout"
          className="mt-4 sm:mt-5 inline-flex w-full justify-center rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)] sm:px-5 sm:py-2.5 sm:text-sm"
        >
          Proceed to Checkout
        </Link>
      </aside>
    </div>

    {suggestedProducts.length > 0 && (
      <section className="mt-6 sm:mt-8 md:mt-12">
        <div className="panel p-4 sm:p-6">
          <h2 className="text-xl font-black sm:text-2xl">Suggested For You</h2>
          <p className="mt-2 text-xs text-[var(--ink-soft)] sm:text-sm">
            Products you might like or have saved to your wishlist
          </p>

          <div className="mt-4 sm:mt-6 overflow-x-auto pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="flex gap-3 sm:gap-4">
              {suggestedProducts.map((product) => (
                <article key={product.id} className="product-card flex-shrink-0 w-40 sm:w-48">
                  <div className="product-card__shine" />
                  <div className="product-card__glow" />
                  <div className="product-card__content">
                    {product.badge ? <p className="product-card__badge">{product.badge}</p> : null}
                    {product.image ? (
                      <div
                        className="h-24 sm:h-28 overflow-hidden rounded-xl border border-black/10 bg-cover bg-center"
                        style={{ backgroundImage: `url('${product.image}')` }}
                        role="img"
                        aria-label={`${product.name} image`}
                      >
                        <span className="sr-only">{product.name} image</span>
                      </div>
                    ) : (
                      <div className="product-card__image" aria-hidden="true" />
                    )}
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      {product.category}
                    </p>
                    <h3 className="line-clamp-2 text-sm font-black product-card__title">{product.name}</h3>
                    <p className="text-xs text-[var(--ink-soft)] line-clamp-1 product-card__description">
                      {product.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-base font-black product-card__price">
                        GHS {product.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-[var(--ink-soft)]">{product.rating.toFixed(1)} / 5</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          const newLine = { productId: product.id, qty: 1 };
                          setLines((prev) => {
                            const existing = prev.find((line) => line.productId === product.id);
                            const next = existing
                              ? prev.map((line) =>
                                  line.productId === product.id ? { ...line, qty: line.qty + 1 } : line
                                )
                              : [...prev, newLine];
                            writeCart(next);
                            return next;
                          });
                        }}
                        className="flex-1 rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--brand-deep)]"
                      >
                        Add
                      </button>
                      <WishlistButton productId={product.id} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    )}
    </>
  );
}

