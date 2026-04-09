import Link from "next/link";
import PromoSlider from "@/components/PromoSlider";
import FlashSaleTimer from "@/components/FlashSaleTimer";
import { getSiteContent } from "@/lib/site-content";

export default async function Home() {
  const content = await getSiteContent();

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {content.features.promoSlider ? <PromoSlider slides={content.promoSlides} /> : null}
      {content.features.flashSale ? (
        <FlashSaleTimer
          key={`${content.flashSale.durationHours}-${content.flashSale.endsAt ?? "none"}-${content.updatedAt}-home`}
          durationHours={content.flashSale.durationHours}
          endsAt={content.flashSale.endsAt}
          eyebrow={content.flashSale.bannerEyebrow}
          title={content.flashSale.bannerTitle}
          description={content.flashSale.bannerDescription}
        />
      ) : null}
      <section className="panel overflow-hidden">
        <div className="grid gap-4 px-4 py-6 sm:gap-6 sm:grid-cols-2 sm:items-center sm:px-6 sm:py-8 md:px-10 md:py-12">
          <div className="space-y-3 sm:space-y-4">
            <p className="inline-flex rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">
              {content.home.badge}
            </p>
            <h1 className="text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
              {content.home.title}
            </h1>
            <p className="text-sm text-[var(--ink-soft)] sm:text-base">
              {content.home.description}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link
                href={content.home.primaryCtaHref}
                className="rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)] sm:px-5 sm:py-2.5 sm:text-sm"
              >
                {content.home.primaryCtaLabel}
              </Link>
              <Link
                href={content.home.secondaryCtaHref}
                className="rounded-full border border-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                {content.home.secondaryCtaLabel}
              </Link>
            </div>
          </div>
          <div className="grid gap-2 sm:gap-3 text-xs sm:text-sm">
            {content.home.highlights.map((highlight) => (
              <div key={highlight.id} className="panel px-3 py-2 sm:px-4 sm:py-3">
                <p className="font-bold text-[var(--brand-deep)]">{highlight.title}</p>
                <p className="text-[var(--ink-soft)]">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
