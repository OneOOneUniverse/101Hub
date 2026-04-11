import Link from "next/link";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { getSiteContent } from "@/lib/site-content";
import WishlistButton from "@/components/WishlistButton";
import ProductCardShare from "@/components/ProductCardShare";
import { getReviewStats } from "@/lib/product-feedback";
import { CoinIcon } from "@/components/Icons";

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
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          <CoinIcon size={16} /> Save up to <span className="ml-1 text-red-600">{content.flashSale.discountPercentage}%</span>
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
                        productDescription={`${item.name} - GHS ${item.salePrice.toFixed(2)}`}
                        slug={item.slug}
                        iconOnly
                        price={item.price}
                        salePrice={item.salePrice}
                        discount={content.flashSale.discountPercentage}
                      />
                    </span>
                    <span className="hidden sm:inline-flex">
                      <ProductCardShare
                        productName={item.name}
                        productDescription={`${item.name} - GHS ${item.salePrice.toFixed(2)}`}
                        slug={item.slug}
                        compact
                        price={item.price}
                        salePrice={item.salePrice}
                        discount={content.flashSale.discountPercentage}
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

              {/* Product name */}
              <h2 className="text-xs font-black leading-tight product-card__title sm:text-sm md:text-base">
                <Link href={`/products/${item.slug}`}>{item.name}</Link>
              </h2>

              {/* Price + stock/rating on same row */}
              <div className="flex items-end justify-between gap-1">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-sm font-black text-red-600 sm:text-base">
                      GHS {item.salePrice.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-[var(--ink-soft)] line-through sm:text-xs">
                      GHS {item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-green-700 sm:text-xs">
                    Save GHS {item.savings.toFixed(2)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-[var(--ink-soft)] sm:text-xs">
                    Qty: {item.stock > 0 ? item.stock : "Out"}
                  </p>
                  {content.features.reviews ? (
                    <p className="text-[10px] text-[var(--ink-soft)] sm:text-xs">
                      ★ {item.reviewStats.average.toFixed(1)}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* View product link */}
              <Link
                href={`/products/${item.slug}`}
                className="inline-flex w-full justify-center rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--brand-deep)] sm:text-sm"
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
