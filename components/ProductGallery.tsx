"use client";

import { useState } from "react";
import Image from "next/image";

type GalleryItem = { type: "image"; src: string } | { type: "video"; src: string };

type ProductGalleryProps = {
  productName: string;
  images: string[];
  videos?: string[];
};

/** Apply Cloudinary video optimizations if the URL is from Cloudinary */
function optimizeVideo(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/q_auto,f_auto,w_960,br_2m/");
}

export default function ProductGallery({ productName, images, videos }: ProductGalleryProps) {
  // Build gallery items: videos first, then images
  const items: GalleryItem[] = [];
  if (videos) {
    for (const v of videos) items.push({ type: "video", src: optimizeVideo(v) });
  }
  for (const img of images) items.push({ type: "image", src: img });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeItem = items[activeIndex] ?? items[0];
  const hasMultipleItems = items.length > 1;

  return (
    <>
      <div className="space-y-3 gallery-container mx-auto sm:space-y-4">
        {activeItem.type === "video" ? (
          <div className="relative overflow-hidden rounded-lg border border-black/10">
            <video
              src={activeItem.src}
              controls
              playsInline
              preload="metadata"
              className="h-64 max-w-full w-auto object-cover sm:h-80 md:h-96 mx-auto"
            />
          </div>
        ) : (
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="relative group overflow-hidden rounded-lg border border-black/10"
          aria-label="View full image"
        >
          <Image
            src={activeItem.src}
            alt={`${productName} view ${activeIndex + 1}`}
            width={800}
            height={800}
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            quality={85}
            className="h-64 max-w-full w-auto object-cover sm:h-80 md:h-96 mx-auto cursor-pointer transition group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition">
            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 13H7" />
            </svg>
          </div>
        </button>
        )}
        {hasMultipleItems ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 max-w-full mx-auto">
            {items.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={`${productName}-thumb-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`overflow-hidden rounded-lg border transition ${
                    isActive
                      ? "border-[var(--brand)] shadow-[0_0_0_2px_rgba(15,118,110,0.16)]"
                      : "border-black/10 hover:border-[var(--brand)]/50"
                  }`}
                  aria-label={`Show ${productName} ${item.type === "video" ? "video" : `image ${index + 1}`}`}
                  aria-pressed={isActive}
                >
                  {item.type === "video" ? (
                    <div className="relative h-16 w-full sm:h-20 md:h-24 bg-black/5 flex items-center justify-center">
                      <video src={item.src} muted preload="metadata" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                  <Image
                    src={item.src}
                    alt={`${productName} thumbnail ${index + 1}`}
                    width={96}
                    height={96}
                    sizes="96px"
                    quality={60}
                    className="h-16 w-full object-cover sm:h-20 md:h-24"
                  />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-xs text-[var(--ink-soft)] px-3 py-2 rounded-lg bg-[var(--surface)] border border-black/5">
            <p>📸 Only one image available</p>
            <p className="text-[10px] mt-0.5">Additional product photos coming soon</p>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            aria-label="Close fullscreen"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center justify-center gap-4 max-h-screen max-w-4xl">
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveIndex((activeIndex - 1 + items.length) % items.length)}
                className="text-white hover:text-gray-300 p-2"
                aria-label="Previous"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

              <div className="flex flex-col items-center">
                {activeItem.type === "video" ? (
                  <video
                    src={activeItem.src}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[70vh] max-w-full rounded-lg"
                  />
                ) : (
                <Image
                  src={activeItem.src}
                  alt={`${productName} fullscreen view ${activeIndex + 1}`}
                  width={1200}
                  height={1200}
                  quality={90}
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="max-h-[70vh] max-w-full object-contain rounded-lg"
                />
                )}
              {items.length > 1 && (
                <p className="mt-4 text-white text-sm">
                  {activeIndex + 1} / {items.length}
                </p>
              )}
            </div>

            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveIndex((activeIndex + 1) % items.length)}
                className="text-white hover:text-gray-300 p-2"
                aria-label="Next"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
