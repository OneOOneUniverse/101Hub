export const revalidate = 60;

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSiteContent } from "@/lib/site-content";
import WishlistButton from "@/components/WishlistButton";
import ProductCardShare from "@/components/ProductCardShare";
import { getReviewStats } from "@/lib/product-feedback";
import PromoSlider from "@/components/PromoSlider";
import StoreShareButton from "@/components/StoreShareButton";

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
      {/* Header / Brand Banner */}
      <section
        className="rounded-3xl p-6 sm:p-10 text-center space-y-3 relative overflow-hidden"
        style={
          store.backgroundImage
            ? { backgroundImage: `url('${store.backgroundImage}')`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: `linear-gradient(135deg, ${store.bgColor}, ${store.accentColor || store.bgColor}cc)` }
        }
      >
        {/* Dark overlay for text legibility when image is set */}
        {store.backgroundImage && (
          <div className="absolute inset-0 bg-black/50 rounded-3xl" />
        )}
        <div className="relative z-10 space-y-3" style={{ color: store.backgroundImage ? "#ffffff" : (store.textColor || "#ffffff") }}>
          <Link
            href="/deals"
            className="inline-flex items-center gap-1 text-sm font-bold opacity-80 hover:opacity-100 transition"
          >
            ← Back to Deals Hub
          </Link>

          {/* Logo or Emoji */}
          {store.logoImage ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={store.logoImage}
                alt={`${store.name} logo`}
                className="h-20 w-20 rounded-2xl object-contain bg-white/20 backdrop-blur-sm p-2 shadow-lg"
              />
            </div>
          ) : (
            <p className="text-5xl">{store.emoji}</p>
          )}

          <h1 className="text-3xl sm:text-4xl font-black">{store.name}</h1>
          {store.tagline && (
            <p className="text-base font-semibold opacity-90 italic">"{store.tagline}"</p>
          )}
          <p className="text-sm opacity-80 max-w-lg mx-auto">{store.description}</p>
          <p className="text-xs font-bold opacity-60">
            {storeProducts.length} product{storeProducts.length !== 1 ? "s" : ""}
          </p>

          {/* Share button */}
          <div className="flex justify-center pt-1">
            <StoreShareButton
              storeName={store.name}
              storeDescription={store.description}
              storeSlug={store.slug}
              emoji={store.emoji}
            />
          </div>
        </div>
      </section>

      {/* Owner / Brand Contact Card */}
      {(store.ownerName || store.ownerPhone || store.ownerEmail || store.ownerWhatsapp || store.ownerInstagram || store.ownerFacebook || store.ownerWebsite || store.ownerLocation) && (
        <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
          <h2 className="text-sm font-black text-[var(--brand-deep)] mb-4 flex items-center gap-2">
            <span className="text-base">🏷️</span> About This Store
          </h2>
          <div className="flex flex-wrap items-start gap-4">
            {/* Owner identity */}
            {store.ownerName && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-black shadow"
                  style={{ background: store.accentColor || store.bgColor }}>
                  {store.ownerName.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-xs text-[var(--ink-soft)]">Store Owner</p>
                  <p className="text-sm font-bold text-[var(--ink)]">{store.ownerName}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {store.ownerLocation && (
              <div className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-[var(--brand)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{store.ownerLocation}</span>
              </div>
            )}
          </div>

          {/* Contact links */}
          <div className="mt-4 flex flex-wrap gap-2">
            {store.ownerPhone && (
              <a
                href={`tel:${store.ownerPhone}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] hover:bg-black/5 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {store.ownerPhone}
              </a>
            )}
            {store.ownerEmail && (
              <a
                href={`mailto:${store.ownerEmail}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] hover:bg-black/5 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {store.ownerEmail}
              </a>
            )}
            {store.ownerWhatsapp && (
              <a
                href={`https://wa.me/${store.ownerWhatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            )}
            {store.ownerInstagram && (
              <a
                href={store.ownerInstagram.startsWith("http") ? store.ownerInstagram : `https://instagram.com/${store.ownerInstagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition"
                style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Instagram
              </a>
            )}
            {store.ownerFacebook && (
              <a
                href={store.ownerFacebook.startsWith("http") ? store.ownerFacebook : `https://facebook.com/${store.ownerFacebook}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1877F2] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
            )}
            {store.ownerWebsite && (
              <a
                href={store.ownerWebsite.startsWith("http") ? store.ownerWebsite : `https://${store.ownerWebsite}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] hover:bg-black/5 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 text-[var(--brand)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Website
              </a>
            )}
          </div>
        </section>
      )}

      {/* Store promo slider (compact) */}
      {store.promoSlides && store.promoSlides.length > 0 && (
        <PromoSlider slides={store.promoSlides} compact />
      )}

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
            // If the store has a fixed price, use it; otherwise fall back to product discount
            const displayPrice = store.storePrice
              ? store.storePrice
              : product.discount && product.discount > 0
                ? Number((product.price * ((100 - product.discount) / 100)).toFixed(2))
                : product.price;
            const isStorePriced = !!store.storePrice && store.storePrice < product.price;
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
                      GHS {displayPrice.toFixed(2)}
                    </span>
                    {isStorePriced && (
                      <span className="text-xs text-[var(--ink-soft)] line-through">
                        GHS {product.price.toFixed(2)}
                      </span>
                    )}
                    {!isStorePriced && product.discount && product.discount > 0 && (
                      <>
                        <span className="text-xs text-[var(--ink-soft)] line-through">
                          GHS {product.price.toFixed(2)}
                        </span>
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                          -{product.discount}%
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
