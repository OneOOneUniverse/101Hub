"use client";

import { useEffect, useState } from "react";
import type { PromoSlide } from "@/lib/site-content-types";

const AUTO_SLIDE_MS = 4200;

type PromoSliderProps = {
  slides: PromoSlide[];
};

export default function PromoSlider({ slides }: Readonly<PromoSliderProps>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedIndex = slides.length ? activeIndex % slides.length : 0;

  useEffect(() => {
    if (slides.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTO_SLIDE_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    return null;
  }

  return (
    <section className="panel promo-slider slider-container mx-auto overflow-hidden" aria-label="Ongoing promos and offers">
      <div className="relative h-40 sm:h-56 md:h-72 lg:h-80">
        {slides.map((slide, index) => {
          const isActive = index === normalizedIndex;

          return (
            <figure
              key={slide.id}
              className={`promo-slide ${isActive ? "promo-slide--active" : ""}`}
              aria-hidden={!isActive}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <figcaption className="promo-slide__caption">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/85">
                  Ongoing Offer
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
    </section>
  );
}
