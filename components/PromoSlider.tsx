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
    <section className="promo-slider slider-container relative mx-auto overflow-hidden rounded-xl" aria-label="Ongoing promos and offers">
      <div className="relative w-full" style={{ aspectRatio: "3 / 1" }}>
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
                  fill
                  priority={isActive}
                  sizes="(max-width: 900px) 100vw, 900px"
                  quality={80}
                  className="object-cover"
                />
              )}
              <figcaption className="promo-slide__caption">
                <div className="promo-slide__caption-inner">
                  <h2 className="promo-slide__title">{slide.title}</h2>
                  {slide.subtitle && (
                    <p className="promo-slide__subtitle">{slide.subtitle}</p>
                  )}
                </div>
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
