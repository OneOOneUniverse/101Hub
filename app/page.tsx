import Link from "next/link";
import PromoSlider from "@/components/PromoSlider";
import FlashSaleTimer from "@/components/FlashSaleTimer";
import BlackFridayBanner from "@/components/BlackFridayBanner";
import HeroVideoBackground from "@/components/HeroVideoBackground";
import { getSiteContent } from "@/lib/site-content";

export const revalidate = 60; // regenerate cached page every 60 seconds

export default async function Home() {
  const content = await getSiteContent();

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {content.features.promoSlider ? <PromoSlider slides={content.promoSlides} /> : null}
      {content.features.blackFriday ? (
        <BlackFridayBanner content={content.blackFriday} />
      ) : null}
      {content.features.flashSale ? (
        <FlashSaleTimer
          key={`${content.flashSale.durationHours}-${content.flashSale.endsAt ?? "none"}-${content.updatedAt}-home`}
          durationHours={content.flashSale.durationHours}
          endsAt={content.flashSale.endsAt}
          eyebrow={content.flashSale.bannerEyebrow}
          title={content.flashSale.bannerTitle}
          description={content.flashSale.bannerDescription}
          backgroundImage={content.flashSale.backgroundImage}
          backgroundVideo={content.flashSale.backgroundVideo}
        />
      ) : null}
      <section className="panel overflow-hidden">
        {/* Hero with video background */}
        <div className="relative isolate">
          {/* Video background — auto-cycles through multiple videos */}
          <HeroVideoBackground
            desktopVideos={[
              ...(content.home.heroVideos ?? []),
              ...(content.home.heroVideoUrl ? [content.home.heroVideoUrl] : []),
            ]}
            mobileVideos={[
              ...(content.home.heroMobileVideos ?? []),
              ...(content.home.heroVideoMobileUrl ? [content.home.heroVideoMobileUrl] : []),
            ]}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/55" />

          {/* Content on top of video */}
          <div className="relative z-10 px-4 py-10 sm:px-6 sm:py-14 md:px-10 md:py-20">
            <div className="mx-auto max-w-2xl text-center space-y-4 sm:space-y-5">
              <p className="inline-flex rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                {content.home.badge}
              </p>
              <h1 className="text-2xl font-black leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-lg">
                {content.home.title}
              </h1>
              <p className="text-sm text-white/80 sm:text-base md:text-lg max-w-xl mx-auto">
                {content.home.description}
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-1 sm:gap-4">
                <Link
                  href={content.home.primaryCtaHref}
                  className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-[var(--brand-deep)] sm:px-7 sm:py-3 sm:text-sm transition-transform active:scale-95"
                >
                  {content.home.primaryCtaLabel}
                </Link>
                <Link
                  href={content.home.secondaryCtaHref}
                  className="rounded-full border-2 border-white/60 bg-white/10 backdrop-blur-sm px-5 py-2.5 text-xs font-bold text-white hover:bg-white/20 sm:px-7 sm:py-3 sm:text-sm transition-transform active:scale-95"
                >
                  {content.home.secondaryCtaLabel}
                </Link>
              </div>
            </div>

            {/* Highlight cards row */}
            {content.home.highlights.length > 0 && (
              <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
                {content.home.highlights.map((highlight) => (
                  <div key={highlight.id} className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 text-center">
                    <p className="font-bold text-white text-sm">{highlight.title}</p>
                    <p className="text-white/70 text-xs mt-0.5">{highlight.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
