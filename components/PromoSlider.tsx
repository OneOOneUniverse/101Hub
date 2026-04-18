"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PromoSlide } from "@/lib/site-content-types";

const AUTO_SLIDE_MS = 4200;

type PromoSliderProps = {
  slides: PromoSlide[];
};

export default function PromoSlider({ slides }: Readonly<PromoSliderProps>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedIndex = slides.length ? activeIndex % slides.length : 0;
  const activeSlideIsVideo = slides[normalizedIndex]?.mediaType === "video";
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const advanceSlide = useCallback(() => {
    setActiveIndex((current) => (current + 1) % slides.length);
  }, [slides.length]);

  // Auto-advance timer only for image slides
  useEffect(() => {
    if (slides.length < 2 || activeSlideIsVideo) {
      return;
    }

    const timer = window.setInterval(() => {
      advanceSlide();
    }, AUTO_SLIDE_MS);

    return () => window.clearInterval(timer);
  }, [slides.length, activeSlideIsVideo, advanceSlide]);

  // Restart video when its slide becomes active again
  useEffect(() => {
    const video = videoRefs.current.get(normalizedIndex);
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {/* autoplay may be blocked */});
    }
  }, [normalizedIndex]);

  if (!slides.length) {
    return null;
  }

  const activeSlide = slides[normalizedIndex];
  const isClickable = activeSlide?.actionUrl;

  return (
    <section className="panel promo-slider slider-container relative mx-auto overflow-hidden" aria-label="Ongoing promos and offers">
      <div className="relative h-40 sm:h-56 md:h-72 lg:h-80">
        {slides.map((slide, index) => {
          const isActive = index === normalizedIndex;

          return (
            <figure
              key={slide.id}
              className={`promo-slide ${isActive ? "promo-slide--active" : ""}`}
              aria-hidden={!isActive}
            >
              {slide.mediaType === "video" ? (
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(index, el);
                    else videoRefs.current.delete(index);
                  }}
                  src={slide.src}
                  autoPlay={isActive}
                  muted
                  playsInline
                  onEnded={slides.length > 1 ? advanceSlide : undefined}
                  loop={slides.length <= 1}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={1920}
                  height={640}
                  priority={isActive}
                  sizes="100vw"
                  quality={75}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <figcaption className="promo-slide__caption">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/85">
                  {slide.eventName || "Ongoing Offer"}
                </p>
                <h2 className="mt-1 text-lg font-black leading-tight text-white sm:mt-2 sm:text-2xl md:text-3xl">
                  {slide.title}
                </h2>
                <p className="mt-1 max-w-md text-xs text-white/90 sm:mt-2 sm:text-sm md:text-base">{slide.subtitle}</p>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="promo-slider__controls">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`promo-slider__dot ${index === normalizedIndex ? "promo-slider__dot--active" : ""}`}
            aria-label={`Show slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Clickable overlay when actionUrl is configured */}
      {isClickable && (
        <Link
          href={activeSlide.actionUrl || "#"}
          className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          style={{ cursor: "pointer", zIndex: 10 }}
          aria-label={`View ${activeSlide.eventName || "offer"}`}
          onClick={(e) => {
            // Don't navigate if clicking on the controls
            const target = e.target as HTMLElement;
            if (target.closest(".promo-slider__controls")) {
              e.preventDefault();
            }
          }}
        />
      )}
    </section>
  );
}
