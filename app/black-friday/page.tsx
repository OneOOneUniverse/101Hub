import Link from "next/link";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { getSiteContent } from "@/lib/site-content";
import WishlistButton from "@/components/WishlistButton";
import ProductCardShare from "@/components/ProductCardShare";
import { getReviewStats } from "@/lib/product-feedback";
import { CoinIcon } from "@/components/Icons";

export default async function BlackFridayPage() {
  const content = await getSiteContent();

  if (!content.features.blackFriday) {
    return (
      <FeatureUnavailable
        title="Black Friday Unavailable"
        description="The Black Friday sale is currently turned off from the admin panel."
        actionHref="/products"
        actionLabel="Browse Products"
      />
    );
  }

  const blackFridayItems = content.products
    .filter((item) => content.blackFriday.featuredProductIds.includes(item.id))
    .map((item) => {
      const salePrice = Number((item.price * ((100 - content.blackFriday.discountPercentage) / 100)).toFixed(2));
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
      {/* Header */}
      <section className="panel p-4 sm:p-6 md:p-8 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white border-none relative overflow-hidden">
        {content.blackFriday.backgroundVideo ? (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover">
              <source src={content.blackFriday.backgroundVideo} />
            </video>
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-black/80 to-gray-900/85" />
          </>
        ) : content.blackFriday.backgroundImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={content.blackFriday.backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-black/80 to-gray-900/85" />
          </>
        ) : null}
        <div className="relative z-10">
        <p className="inline-flex rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-yellow-400">
          {content.blackFriday.pageEyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black">{content.blackFriday.pageTitle}</h1>
        <p className="mt-2 text-gray-300">
          {content.blackFriday.pageDescription}
        </p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-sm font-semibold text-yellow-400">
          <CoinIcon size={16} /> Save up to <span className="ml-1 text-yellow-300">{content.blackFriday.discountPercentage}%</span>
        </p>
        </div>
      </section>

      {blackFridayItems.length === 0 ? (
        <section className="panel p-6 text-center">
          <p className="text-[var(--ink-soft)]">No products have been added to the Black Friday sale yet. Check back soon!</p>
          <Link href="/products" className="mt-4 inline-block rounded-full bg-[var(--brand)] px-6 py-2 text-sm font-bold text-white hover:bg-[var(--brand-deep)]">
            Browse All Products
          </Link>
        </section>
      ) : (
        <section className="grid grid-cols-2 items-start gap-3 sm:gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {blackFridayItems.map((item) => (
            <article key={item.id} className="product-card">
              <div className="product-card__shine" />
              <div className="product-card__glow" />
              <div className="product-card__content">
                {/* Black Friday badge */}
                <div className="absolute inset-x-3 top-3 z-10">
                  <div className="flex items-end justify-between gap-2">
                    <p className="rounded-lg bg-black px-2 py-1 text-[10px] font-black text-yellow-400 border border-yellow-500/30">
                      -{content.blackFriday.discountPercentage}%
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
                          discount={content.blackFriday.discountPercentage}
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
                          discount={content.blackFriday.discountPercentage}
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
                      <p className="text-sm font-black text-yellow-600 sm:text-base">
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
      )}
    </div>
  );
}
