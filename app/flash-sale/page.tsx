import Link from "next/link";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { getSiteContent } from "@/lib/site-content";

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
    .map((item) => ({
      ...item,
      salePrice: Number((item.price * ((100 - content.flashSale.discountPercentage) / 100)).toFixed(2)),
    }));

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <p className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
          {content.flashSale.pageEyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black">{content.flashSale.pageTitle}</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          {content.flashSale.pageDescription}
        </p>
      </section>

      <section className="grid grid-cols-2 items-start gap-2 sm:gap-4 xl:grid-cols-3">
        {flashSaleItems.map((item) => (
          <article key={item.id} className="panel p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">{item.category}</p>
            <h2 className="mt-1 text-xl font-black text-[var(--brand-deep)]">{item.name}</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{item.description}</p>

            <div className="mt-4 flex items-end gap-3">
              <p className="text-xl font-black text-[var(--brand-deep)]">GHS {item.salePrice.toFixed(2)}</p>
              <p className="text-sm text-[var(--ink-soft)] line-through">GHS {item.price.toFixed(2)}</p>
            </div>

            <Link
              href={`/products/${item.slug}`}
              className="mt-4 inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
            >
              View Product
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
