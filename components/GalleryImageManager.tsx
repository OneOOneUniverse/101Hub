"use client";

import { useRef, useState } from "react";
import ImageUploadButton from "@/components/ImageUploadButton";

interface GalleryImageManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  productId: string;
  productSlug: string;
  label?: string;
}

export default function GalleryImageManager({
  images,
  onChange,
  productId,
  productSlug,
  label = "Gallery Images",
}: GalleryImageManagerProps) {
  const [draggedItemIdx, setDraggedItemIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const urlInputRef = useRef<HTMLTextAreaElement>(null);

  // Handle drag start
  const handleDragStart = (idx: number) => {
    setDraggedItemIdx(idx);
  };

  // Handle drag over
  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  // Handle drop to reorder
  const handleDrop = (dropIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItemIdx === null || draggedItemIdx === dropIdx) {
      setDraggedItemIdx(null);
      setDragOverIdx(null);
      return;
    }

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedItemIdx, 1);
    newImages.splice(dropIdx, 0, draggedImage);
    onChange(newImages);
    setDraggedItemIdx(null);
    setDragOverIdx(null);
  };

  // Remove image
  const removeImage = (idx: number) => {
    const newImages = images.filter((_, i) => i !== idx);
    onChange(newImages);
  };

  // Move image up
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newImages = [...images];
    [newImages[idx], newImages[idx - 1]] = [newImages[idx - 1], newImages[idx]];
    onChange(newImages);
  };

  // Move image down
  const moveDown = (idx: number) => {
    if (idx === images.length - 1) return;
    const newImages = [...images];
    [newImages[idx], newImages[idx + 1]] = [newImages[idx + 1], newImages[idx]];
    onChange(newImages);
  };

  // Add images from URL textarea
  const addImagesFromUrls = () => {
    const urlText = urlInputRef.current?.value || "";
    const newUrls = urlText
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url && (url.startsWith("http://") || url.startsWith("https://")));

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
      if (urlInputRef.current) {
        urlInputRef.current.value = "";
      }
    }
  };

  // Clear all images
  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear all gallery images?")) {
      onChange([]);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-[var(--brand-deep)] mb-2">
          {label}
        </label>
        <p className="text-xs text-[var(--ink-soft)] mb-3">
          Drag to reorder images, or add multiple URLs below. Up to 8 images recommended.
        </p>
      </div>

      {/* Current Gallery Preview */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-emerald-900">
            Current Gallery ({images.length} image{images.length !== 1 ? "s" : ""})
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {images.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(idx, e)}
                onDrop={(e) => handleDrop(idx, e)}
                onDragLeave={() => setDragOverIdx(null)}
                className={`relative group rounded-lg overflow-hidden border-2 cursor-move transition ${
                  dragOverIdx === idx && draggedItemIdx !== null
                    ? "border-[var(--brand)] bg-[var(--brand)]/5 scale-105"
                    : draggedItemIdx === idx
                      ? "border-[var(--brand)] opacity-75"
                      : "border-black/10 hover:border-[var(--brand)]"
                }`}
              >
                {/* Image */}
                <img
                  src={url}
                  alt={`Gallery image ${idx + 1}`}
                  className="w-full h-24 object-cover"
                />

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex flex-col items-center justify-center">
                  <div className="flex gap-1">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => moveUp(idx)}
                        title="Move up"
                        className="p-1 bg-white/90 hover:bg-white rounded transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    )}
                    {idx < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveDown(idx)}
                        title="Move down"
                        className="p-1 bg-white/90 hover:bg-white rounded transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      title="Remove image"
                      className="p-1 bg-red-500/90 hover:bg-red-600 text-white rounded transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Image Number */}
                <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="border border-black/10 rounded-lg p-4 bg-[var(--surface)]">
        <div className="space-y-3">
          {/* Upload Button */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink-soft)] mb-2">
              Option 1: Upload from Computer
            </p>
            <ImageUploadButton
              folder={`products/${productSlug || productId}`}
              multiple
              onUpload={(url) => {
                onChange([...images, url]);
              }}
              onUploadAll={(urls) => {
                onChange([...images, ...urls]);
              }}
              label="Select Images to Upload"
            />
            <p className="text-[10px] text-[var(--ink-soft)] mt-1">
              Select multiple files at once to add them all to your gallery
            </p>
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-black/10"></div>
            <span className="text-[10px] font-semibold text-[var(--ink-soft)]">OR</span>
            <div className="h-px flex-1 bg-black/10"></div>
          </div>

          {/* Paste URLs */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink-soft)] mb-2">
              Option 2: Paste Image URLs
            </p>
            <textarea
              ref={urlInputRef}
              placeholder="Paste one URL per line:&#10;https://res.cloudinary.com/.../image1.jpg&#10;https://res.cloudinary.com/.../image2.jpg&#10;https://res.cloudinary.com/.../image3.jpg"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--brand)] min-h-[80px]"
            />
            <button
              type="button"
              onClick={addImagesFromUrls}
              className="mt-2 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)] transition"
            >
              Add URLs to Gallery
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        {images.length > 0 && (
          <>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition"
            >
              Clear All
            </button>
            <p className="text-[10px] text-[var(--ink-soft)] flex items-center">
              {images.length} image{images.length !== 1 ? "s" : ""} in gallery
            </p>
          </>
        )}
      </div>
    </div>
  );
}
