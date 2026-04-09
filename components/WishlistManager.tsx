"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { readWishlist } from "@/lib/product-feedback";
import { useStoreContent } from "@/lib/use-store-content";
import WishlistButton from "@/components/WishlistButton";

export default function WishlistManager() {
  const { content, loading, error } = useStoreContent();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
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

  const items = useMemo(
    () => products.filter((product) => wishlistIds.includes(product.id)),
    [products, wishlistIds]
  );

  if (loading) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Wishlist</h1>
        <p className="mt-2 text-[var(--ink-soft)]">Loading wishlist...</p>
      </section>
    );
  }

  if (error || !content) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Wishlist</h1>
        <p className="mt-2 text-red-600">{error || "Could not load wishlist data."}</p>
      </section>
    );
  }

  if (!content.features.wishlist) {
    return (
      <FeatureUnavailable
        title="Wishlist Unavailable"
        description="The wishlist feature is currently turned off from the admin panel."
        actionHref="/products"
        actionLabel="Browse Products"
      />
    );
  }

  if (!items.length) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Your Wishlist Is Empty</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Saved items will appear here after you tap the wishlist button on a product.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
        >
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <h1 className="text-3xl font-black">Wishlist</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Your saved gadgets are stored here for quick access.
        </p>
      </section>

      <section className="grid grid-cols-2 items-start gap-2 sm:gap-4 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="product-card">
            <div className="product-card__shine" />
            <div className="product-card__glow" />
            <div className="product-card__content">
              {item.badge ? <p className="product-card__badge">{item.badge}</p> : null}
              {item.image ? (
                <div
                  className="h-28 overflow-hidden rounded-xl border border-black/10 bg-cover bg-center sm:h-36"
                  style={{ backgroundImage: `url('${item.image}')` }}
                  role="img"
                  aria-label={`${item.name} image`}
                >
                  <span className="sr-only">{item.name} image</span>
                </div>
              ) : (
                <div className="product-card__image" aria-hidden="true" />
              )}
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                {item.category}
              </p>
              <h2 className="text-xl font-black product-card__title">{item.name}</h2>
              <p className="text-sm text-[var(--ink-soft)] product-card__description">{item.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-black product-card__price">GHS {item.price.toFixed(2)}</p>
                <p className="text-sm text-[var(--ink-soft)]">{item.rating.toFixed(1)} / 5</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/products/${item.slug}`}
                  className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
                >
                  View Product
                </Link>
                <WishlistButton productId={item.id} />
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
