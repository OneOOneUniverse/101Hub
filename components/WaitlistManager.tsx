"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readWaitlist } from "@/lib/product-feedback";
import { useStoreContent } from "@/lib/use-store-content";
import WaitlistButton from "@/components/WaitlistButton";

export default function WaitlistManager() {
  const { content, loading, error } = useStoreContent();
  const [waitlistIds, setWaitlistIds] = useState<string[]>([]);
  const products = useMemo(() => content?.products ?? [], [content?.products]);

  useEffect(() => {
    const sync = () => setWaitlistIds(readWaitlist());
    sync();

    window.addEventListener("101hub:waitlist-updated", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("101hub:waitlist-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const items = useMemo(
    () => products.filter((product) => waitlistIds.includes(product.id)),
    [products, waitlistIds],
  );

  if (loading) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Waitlist</h1>
        <p className="mt-2 text-[var(--ink-soft)]">Loading waitlist...</p>
      </section>
    );
  }

  if (error || !content) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Waitlist</h1>
        <p className="mt-2 text-red-600">{error || "Could not load waitlist data."}</p>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Your Waitlist Is Empty</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Products you join the waitlist for will appear here. Hit &ldquo;Add to Waitlist&rdquo; on
          any out-of-stock or upcoming product.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <h1 className="text-3xl font-black">Waitlist</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          You&apos;ll be notified when these products become available.
        </p>
        <p className="mt-1 text-sm font-semibold text-blue-600">
          {items.length} product{items.length !== 1 ? "s" : ""} on your waitlist
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
              <p className="text-sm text-[var(--ink-soft)] product-card__description">
                {item.description}
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Waitlisted
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-black product-card__price">GHS {item.price.toFixed(2)}</p>
                <p className="text-sm text-[var(--ink-soft)]">{item.rating.toFixed(1)} / 5</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={item.badge === "Vendor" ? `/products/vendor/${item.id}` : `/products/${item.slug}`}
                  className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
                >
                  View Product
                </Link>
                <WaitlistButton productId={item.id} />
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
