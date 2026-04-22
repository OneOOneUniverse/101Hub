export const revalidate = 60;

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSiteContent } from "@/lib/site-content";
import WishlistButton from "@/components/WishlistButton";
import ProductCardShare from "@/components/ProductCardShare";
import { getReviewStats } from "@/lib/product-feedback";

type Props = { params: Promise<{ slug: string }> };

export default async function SpecialStorePage({ params }: Props) {
  const { slug } = await params;
  const content = await getSiteContent();

  if (!content.features.dealsHub || !content.dealsHub.enabled) {
    redirect("/");
  }

  const store = content.dealsHub.specialStores.find(
    (s) => s.slug === slug && s.enabled
  );

  if (!store) return notFound();

  const storeProducts = content.products.filter((p) =>
    store.featuredProductIds.includes(p.id)
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <section
        className="rounded-3xl p-6 sm:p-10 text-center space-y-3"
        style={{ backgroundColor: store.bgColor, color: store.textColor }}
      >
        <Link
          href="/deals"
          className="inline-flex items-center gap-1 text-sm font-bold opacity-80 hover:opacity-100 transition"
        >
          ← Back to Deals Hub
        </Link>
        <p className="text-5xl">{store.emoji}</p>
        <h1 className="text-3xl sm:text-4xl font-black">{store.name}</h1>
        <p className="text-sm opacity-80 max-w-lg mx-auto">{store.description}</p>
        <p className="text-xs font-bold opacity-60">
          {storeProducts.length} product{storeProducts.length !== 1 ? "s" : ""}
        </p>
      </section>

      {/* Products grid */}
      {storeProducts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">📦</p>
          <p className="text-lg font-bold text-[var(--ink-soft)]">
            No products in this store yet.
          </p>
          <Link
            href="/products"
            className="inline-block rounded-full bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
          >
            Browse All Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {storeProducts.map((product) => {
            const hasDiscount = product.discount && product.discount > 0;
            const discountPercent = hasDiscount ? product.discount! : 0;
            const salePrice = discountPercent
              ? Number(
                  (
                    product.price *
                    ((100 - discountPercent) / 100)
                  ).toFixed(2)
                )
              : product.price;
            const reviewStats = content.features.reviews
              ? getReviewStats(product.id, product.rating)
              : { average: product.rating, count: 0 };

            return (
              <div
                key={product.id}
                className="product-card group relative rounded-2xl border border-black/5 bg-white shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                {/* Badge */}
                {product.badge && (
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-[var(--brand)] px-2.5 py-0.5 text-xs font-bold text-white shadow">
                    {product.badge}
                  </span>
                )}

                {/* Product actions */}
                <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
                  {content.features.wishlist && (
                    <WishlistButton productId={product.id} />
                  )}
                  <ProductCardShare productName={product.name} slug={product.slug} />
                </div>

                {/* Image */}
                <Link href={`/products/${product.slug}`}>
                  <div className="aspect-square w-full overflow-hidden rounded-t-2xl bg-[var(--surface)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                </Link>

                {/* Info */}
                <div className="p-3 space-y-1">
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="text-sm font-bold text-[var(--ink)] line-clamp-2 hover:text-[var(--brand)]">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="text-xs text-[var(--ink-soft)]">
                    {product.category}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-amber-500">
                      {"★".repeat(Math.round(reviewStats.average))}
                      {"☆".repeat(5 - Math.round(reviewStats.average))}
                    </span>
                    {reviewStats.count > 0 && (
                      <span className="text-[10px] text-[var(--ink-soft)]">
                        ({reviewStats.count})
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-[var(--brand-deep)]">
                      GHS {salePrice.toFixed(2)}
                    </span>
                    {discountPercent > 0 && (
                      <>
                        <span className="text-xs text-[var(--ink-soft)] line-through">
                          GHS {product.price.toFixed(2)}
                        </span>
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                          -{discountPercent}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
