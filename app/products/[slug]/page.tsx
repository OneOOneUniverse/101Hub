import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSiteContent } from "@/lib/site-content";
import {
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/store-data";
import { getResolvedProductGallery } from "@/lib/product-gallery.server";
import ProductGallery from "@/components/ProductGallery";
import ProductReviews from "@/components/ProductReviews";
import WishlistButton from "@/components/WishlistButton";
import ProductCardShare from "@/components/ProductCardShare";
import ProductDetailActions from "@/components/ProductDetailActions";
import ViewCounter from "@/components/ViewCounter";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = await getSiteContent();
  const product = getProductBySlug(content.products, slug);

  if (!product) {
    return {
      title: "Product Not Found | 101Hub",
    };
  }

  // Calculate discount and price
  const hasProductDiscount = product.discount && product.discount > 0;
  const discountPercent = hasProductDiscount ? product.discount : 0;
  const isFlashSale = !hasProductDiscount && content.features.flashSale && content.flashSale.featuredProductIds.includes(product.id);
  const flashSalePercent = isFlashSale ? content.flashSale.discountPercentage : 0;
  const totalDiscount = discountPercent || flashSalePercent;
  const salePrice = totalDiscount > 0
    ? Number((product.price * ((100 - totalDiscount) / 100)).toFixed(2))
    : product.price;

  // Build attractive description with price
  const priceText = totalDiscount > 0 
    ? `GHS ${salePrice.toFixed(2)} (was GHS ${product.price.toFixed(2)}) - Save GHS ${(product.price - salePrice).toFixed(2)}`
    : `GHS ${product.price.toFixed(2)}`;

  const shortDescription = product.description.split('\n')[0].substring(0, 120);
  const shareDescription = `${product.name} - ${priceText}\n\n${shortDescription}...\n\nShop now at 101Hub!`;

  return {
    title: `${product.name} | 101Hub`,
    description: shareDescription,
    openGraph: {
      title: product.name,
      description: shareDescription,
      type: "website",
      url: `/products/${slug}`,
      images: product.image ? [
        {
          url: product.image,
          width: 1200,
          height: 900,
          alt: product.name,
          type: "image/jpeg",
        },
      ] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: shareDescription,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductDetailsPage({ params }: ProductPageProps) {
  await connection();
  const { slug } = await params;
  const content = await getSiteContent();
  const product = getProductBySlug(content.products, slug);

  if (!product) {
    notFound();
  }

  const gallery = await getResolvedProductGallery(product, 4);
  const related = getRelatedProducts(content.products, slug, 3);

  // Product-specific discount takes priority
  const hasProductDiscount = product.discount && product.discount > 0;
  const discountPercent = hasProductDiscount ? product.discount : 0;
  
  // Check if product is in flash sale (but only if no product-specific discount)
  const isFlashSale = !hasProductDiscount && content.features.flashSale && content.flashSale.featuredProductIds.includes(product.id);
  const flashSalePercent = isFlashSale ? content.flashSale.discountPercentage : 0;
  
  // Determine which discount to show
  const totalDiscount = discountPercent || flashSalePercent;
  const salePrice = totalDiscount > 0
    ? Number((product.price * ((100 - totalDiscount) / 100)).toFixed(2))
    : product.price;
  const displayPrice = salePrice;
  const savings = product.price - salePrice;
  const isOnSale = totalDiscount > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="panel p-4 sm:p-6 md:p-8">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr]">
          <ProductGallery productName={product.name} images={gallery} videos={product.videos} />

          <div className="space-y-3 sm:space-y-4">
            <p className="inline-flex rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--brand-deep)]">
              {product.category}
            </p>
            <h1 className="text-2xl font-black leading-tight sm:text-3xl">{product.name}</h1>
            <ViewCounter page={`/products/${slug}`} />
            
            {/* Formatted Description — clamped; full text is in the section below */}
            <div className="relative">
              <div className="prose prose-sm max-w-none text-sm text-[var(--ink-soft)] sm:prose-base [&>*]:mb-2 [overflow:hidden] max-h-[5.5rem]">
                {product.description.split(/\n\n+/).map((paragraph, idx) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;

                  if (trimmed.startsWith("•")) {
                    return (
                      <ul key={idx} className="space-y-1 list-none pl-0">
                        {trimmed.split("\n").map((bullet, bulletIdx) => {
                          const bulletContent = bullet.trim();
                          if (bulletContent.startsWith("•")) {
                            return (
                              <li key={bulletIdx} className="flex gap-2">
                                <span className="text-[var(--brand)] font-bold flex-shrink-0">•</span>
                                <span>{bulletContent.replace("•", "").trim()}</span>
                              </li>
                            );
                          }
                          return null;
                        })}
                      </ul>
                    );
                  }

                  if (trimmed.match(/^[A-Z][A-Z\s]+:?$/) || trimmed.endsWith(":")) {
                    return (
                      <h3 key={idx} className="font-bold text-[var(--brand-deep)] mt-2 mb-1">
                        {trimmed.replace(":", "")}
                      </h3>
                    );
                  }

                  return (
                    <p key={idx} className="leading-relaxed">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
              {/* Fade + read-more link */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
              <a
                href="#product-description"
                className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--brand)] hover:underline"
              >
                Read full description
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3v10M3 8l5 5 5-5" />
                </svg>
              </a>
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-3 sm:p-4">
              {isOnSale && (
                <div className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 ${hasProductDiscount ? "bg-[var(--brand)]/10" : "bg-red-50"}`}>
                  <p className={`text-xs font-bold ${hasProductDiscount ? "text-[var(--brand-deep)]" : "text-red-700"}`}>
                    {hasProductDiscount ? "Product Discount" : "Flash Sale"}
                  </p>
                  <p className={`text-sm font-black ${hasProductDiscount ? "text-[var(--brand-deep)]" : "text-red-600"}`}>-{totalDiscount}%</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--ink-soft)] sm:text-sm">Price</p>
                <div>
                  <p className={`text-xl font-black sm:text-2xl ${isOnSale ? (hasProductDiscount ? "text-[var(--brand-deep)]" : "text-red-600") : ""}`}>
                    GHS {displayPrice.toFixed(2)}
                  </p>
                  {isOnSale && (
                    <p className="mt-1 text-xs text-[var(--ink-soft)] line-through">
                      GHS {product.price.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              {isOnSale && (
                <div className={`mt-2 rounded-lg px-3 py-2 ${hasProductDiscount ? "bg-purple-50" : "bg-green-50"}`}>
                  <p className={`text-xs font-bold ${hasProductDiscount ? "text-purple-700" : "text-green-700"}`}>
                    Save GHS {savings.toFixed(2)}
                  </p>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-[var(--ink-soft)] sm:text-sm">Availability</p>
                <p className="text-xs font-semibold sm:text-sm">{product.stock} units in stock</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-[var(--ink-soft)] sm:text-sm">Rating</p>
                <p className="text-xs font-semibold sm:text-sm">{product.rating.toFixed(1)} / 5</p>
              </div>
            </div>

            <ProductDetailActions 
              productId={product.id} 
              features={content.features}
              productName={product.name}
              productDescription={product.description}
              productImage={product.image}
              productSlug={product.slug}
              price={product.price}
              salePrice={displayPrice}
              discount={totalDiscount}
              sizes={product.sizes}
              colors={product.colors}
              variants={product.variants}
              stock={product.stock}
            />
          </div>
        </div>
      </section>

      {content.features.reviews ? <ProductReviews productId={product.id} baseRating={product.rating} /> : null}

      {/* ── Product Description ──────────────────────────────────── */}
      <section id="product-description" className="panel overflow-hidden">
        {/* Header band */}
        <div className="border-b border-black/8 bg-gradient-to-r from-[var(--brand)]/8 to-transparent px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/15">
              <svg viewBox="0 0 20 20" className="h-5 w-5 text-[var(--brand-deep)]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5H7a2 2 0 00-2 2v9a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h0a2 2 0 002-2M9 5a2 2 0 012-2h0a2 2 0 012 2" />
              </svg>
            </span>
            <div>
              <h2 className="text-xl font-black sm:text-2xl">About This Product</h2>
              <p className="text-xs text-[var(--ink-soft)] sm:text-sm">{product.name}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Full formatted description */}
          <div className="prose prose-sm max-w-none text-[var(--ink-soft)] leading-relaxed sm:prose-base [&_p]:mb-3 [&_h3]:text-[var(--brand-deep)] [&_h3]:font-bold [&_h3]:text-sm [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:mt-4 [&_h3]:mb-2">
            {product.description.split(/\n\n+/).map((paragraph, idx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;

              if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
                return (
                  <ul key={idx} className="space-y-2 list-none pl-0 not-prose">
                    {trimmed.split("\n").map((bullet, bulletIdx) => {
                      const content = bullet.trim().replace(/^[•\-]\s*/, "");
                      if (!content) return null;
                      return (
                        <li key={bulletIdx} className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/15">
                            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-[var(--brand-deep)]" fill="currentColor" aria-hidden="true">
                              <circle cx="5" cy="5" r="3" />
                            </svg>
                          </span>
                          <span className="text-sm text-[var(--ink-soft)]">{content}</span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              if (trimmed.match(/^[A-Z][A-Z\s]+:?$/) || (trimmed.endsWith(":") && trimmed.length < 60)) {
                return (
                  <h3 key={idx} className="mt-4 mb-2 text-xs font-bold uppercase tracking-widest text-[var(--brand-deep)] not-prose">
                    {trimmed.replace(/:$/, "")}
                  </h3>
                );
              }

              return (
                <p key={idx} className="text-sm leading-relaxed text-[var(--ink-soft)]">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Key highlights grid */}
          <div className="grid grid-cols-1 gap-3 border-t border-black/8 pt-5 sm:grid-cols-2">
            {[
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "1-Year Warranty", sub: "Standard warranty coverage included" },
              { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", label: "Quality Checked", sub: "Verified before dispatch from 101Hub" },
              { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Fast Support", sub: "Quick help via 101Hub services" },
              { icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z", label: "Wide Compatibility", sub: "Works with popular accessories" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl border border-black/8 bg-[var(--surface)] p-3 sm:p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]/12">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--brand-deep)]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={icon} />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-[var(--ink)]">{label}</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black">You May Also Like</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Suggested products based on this item.
          </p>
        </div>

        <div className="grid grid-cols-2 items-start gap-2 sm:gap-4 xl:grid-cols-3">
          {related.map((item) => {
            // Product-specific discount takes priority
            const relatedHasProductDiscount = item.discount && item.discount > 0;
            const relatedDiscountPercent = relatedHasProductDiscount ? item.discount : 0;
            
            // Check if product is in flash sale (but only if no product-specific discount)
            const relatedIsFlashSale = !relatedHasProductDiscount && content.features.flashSale && content.flashSale.featuredProductIds.includes(item.id);
            const relatedFlashSalePercent = relatedIsFlashSale ? content.flashSale.discountPercentage : 0;
            
            // Determine which discount to show
            const relatedTotalDiscount = relatedDiscountPercent || relatedFlashSalePercent;
            const relatedSalePrice = relatedTotalDiscount > 0
              ? Number((item.price * ((100 - relatedTotalDiscount) / 100)).toFixed(2))
              : item.price;
            const relatedDisplayPrice = relatedSalePrice;
            const relatedIsOnSale = relatedTotalDiscount > 0;

            return (
              <article key={item.id} className="product-card">
                <div className="product-card__shine" />
                <div className="product-card__glow" />
                <div className="product-card__content">
                  {relatedIsOnSale && (
                    <p className={`absolute right-3 top-3 z-10 rounded-lg px-2 py-1 text-[10px] font-black text-white ${relatedHasProductDiscount ? "bg-purple-600" : "bg-red-600"}`}>
                      -{relatedTotalDiscount}%
                    </p>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    {item.category}
                  </p>
                  <h3 className="text-xl font-black product-card__title">{item.name}</h3>
                  <p className="text-sm text-[var(--ink-soft)] product-card__description">
                    {item.description}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <p className={`text-lg font-black product-card__price ${relatedIsOnSale ? (relatedHasProductDiscount ? "text-purple-600" : "text-red-600") : ""}`}>
                        GHS {relatedDisplayPrice.toFixed(2)}
                      </p>
                      {relatedIsOnSale && (
                        <p className="text-sm text-[var(--ink-soft)] line-through">
                          GHS {item.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">{item.rating.toFixed(1)} rating</p>
                  </div>
                  <Link
                    href={`/products/${item.slug}`}
                    className="mt-4 inline-flex w-fit rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
                  >
                    View Product
                  </Link>
                  {content.features.wishlist ? (
                    <div className="mt-2 flex gap-1.5">
                      <ProductCardShare 
                        productName={item.name}
                        productDescription={`${item.name} - GHS ${relatedDisplayPrice.toFixed(2)}`}
                        slug={item.slug}
                        compact
                        price={item.price}
                        salePrice={relatedDisplayPrice}
                        discount={relatedTotalDiscount}
                      />
                      <WishlistButton productId={item.id} />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
