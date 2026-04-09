import Link from "next/link";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { getSiteContent } from "@/lib/site-content";
import WishlistButton from "@/components/WishlistButton";
import { getReviewStats } from "@/lib/product-feedback";

export default async function FlashSalePage() {
  const content = await getSiteContent();

  if (!content.features.flashSale) {
    return (
      <FeatureUnavailable
        title="Flash Sale Unavailable"
        description="The flash sale feature is currently turned off from the admin panel."
        actionHref="/products"
        actionLabel="Browse Products"
      />
    );
  }

  const flashSaleItems = content.products
    .filter((item) => content.flashSale.featuredProductIds.includes(item.id))
    .map((item) => {
      const salePrice = Number((item.price * ((100 - content.flashSale.discountPercentage) / 100)).toFixed(2));
      const savings = item.price - salePrice;
      return {
        ...item,
        salePrice,
        savings,
        reviewStats: content.features.reviews ? getReviewStats(item.id, item.rating) : { average: item.rating, count: 0 },
      };
    });

  return (
    <div className="space-y-6">
      <section className="panel p-4 sm:p-6 md:p-8">
        <p className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
          {content.flashSale.pageEyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black">{content.flashSale.pageTitle}</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          {content.flashSale.pageDescription}
        </p>
        <p className="mt-4 inline-flex rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          💰 Save up to <span className="ml-1 text-red-600">{content.flashSale.discountPercentage}%</span>
        </p>
      </section>

      <section className="grid grid-cols-2 items-start gap-3 sm:gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {flashSaleItems.map((item) => (
          <article key={item.id} className="product-card">
            <div className="product-card__shine" />
            <div className="product-card__glow" />
            <div className="product-card__content">
              {/* Flash sale badge */}
              <div className="absolute inset-x-3 top-3 z-10">
                <div className="flex items-end justify-between gap-2">
                  <p className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                    -{content.flashSale.discountPercentage}%
                  </p>
                  {item.badge ? (
                    <p className="product-card__badge">{item.badge}</p>
                  ) : null}
                </div>
              </div>

              {/* Product image */}
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

              {/* Wishlist button */}
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

              {/* Category */}
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)] sm:text-xs md:text-[11px]">
                {item.category}
              </p>

              {/* Product name */}
              <h2 className="text-xs font-black leading-tight product-card__title sm:text-sm md:text-base">
                <Link href={`/products/${item.slug}`}>{item.name}</Link>
              </h2>

              {/* Pricing section */}
              <div className="mt-2 sm:mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-black text-red-600 sm:text-xl">
                    GHS {item.salePrice.toFixed(2)}
                  </p>
                  <p className="text-sm text-[var(--ink-soft)] line-through">
                    GHS {item.price.toFixed(2)}
                  </p>
                </div>
                <p className="mt-1 text-xs font-bold text-green-700">
                  Save GHS {item.savings.toFixed(2)}
                </p>
              </div>

              {/* Stock and rating info */}
              <div className="mt-2 grid grid-cols-2 gap-2 text-right sm:mt-3">
                <div>
                  <p className="text-[10px] text-[var(--ink-soft)] sm:text-xs">Stock</p>
                  <p className="font-bold text-[11px] sm:text-sm">
                    {item.stock > 0 ? item.stock : "Out"}
                  </p>
                </div>
                {content.features.reviews ? (
                  <div>
                    <p className="text-[10px] text-[var(--ink-soft)] sm:text-xs">Rating</p>
                    <p className="font-bold text-[11px] sm:text-sm">
                      {item.reviewStats.average.toFixed(1)} / 5
                    </p>
                  </div>
                ) : null}
              </div>

              {/* View product link */}
              <Link
                href={`/products/${item.slug}`}
                className="mt-3 inline-flex w-full justify-center rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--brand-deep)] sm:mt-4 sm:text-sm"
              >
                View Product
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
