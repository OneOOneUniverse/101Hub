"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addProductReview,
  getReviewStats,
  readProductReviews,
  type ProductReview,
} from "@/lib/product-feedback";
import { sanitizeLine, sanitizeText, isValidName, hasMinLength, hasMaxLength } from "@/lib/validation";

type ProductReviewsProps = {
  productId: string;
  baseRating: number;
};

export default function ProductReviews({ productId, baseRating }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [author, setAuthor] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const sync = () => setReviews(readProductReviews(productId));
    sync();

    window.addEventListener("101hub:reviews-updated", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("101hub:reviews-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [productId]);

  const stats = useMemo(() => getReviewStats(productId, baseRating), [productId, baseRating, reviews]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const safeAuthor = sanitizeLine(author);
    const safeComment = sanitizeText(comment);

    if (safeAuthor && !isValidName(safeAuthor)) {
      setFormError("Name can only contain letters, spaces, hyphens, or apostrophes (2–80 chars).");
      return;
    }
    if (!hasMinLength(safeComment, 10)) {
      setFormError("Review must be at least 10 characters long.");
      return;
    }
    if (!hasMaxLength(safeComment, 1000)) {
      setFormError("Review is too long (max 1000 characters).");
      return;
    }
    if (rating < 1 || rating > 5) {
      setFormError("Please select a rating between 1 and 5.");
      return;
    }

    addProductReview({ productId, author: safeAuthor || "Anonymous", comment: safeComment, rating });
    setAuthor("");
    setComment("");
    setRating(5);
    setFormError("");
    setReviews(readProductReviews(productId));
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Ratings and Reviews</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Rating: {stats.average.toFixed(1)} / 5 ({stats.count} user reviews)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-styled mt-4 grid gap-3 p-4 sm:grid-cols-2">
        <input
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Your name (optional)"
          maxLength={80}
          className="input-styled"
        />
        <div className="flex items-center gap-2 rounded-lg border-2 border-[rgba(255,107,53,0.25)] px-3 py-2 transition-all hover:border-[var(--brand)]">
          <span className="text-sm font-semibold text-[var(--ink-soft)]">Your rating</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= rating;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="rounded p-1 text-[var(--accent)] transition hover:scale-110"
                  aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-5 w-5 ${active ? "fill-current" : "fill-none stroke-current"}`}
                    strokeWidth="1.8"
                  >
                    <path d="M12 3.6l2.63 5.33 5.88.85-4.26 4.15 1 5.86L12 17.02 6.75 19.79l1-5.86-4.26-4.15 5.88-.85L12 3.6z" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
        <textarea
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
            if (formError) setFormError("");
          }}
          placeholder="Write a short review (min 10 characters)"
          maxLength={1000}
          className="input-styled sm:col-span-2 min-h-28"
        />
        <p className="sm:col-span-2 text-right text-xs text-[var(--ink-soft)] -mt-2">{comment.length}/1000</p>
        {formError && (
          <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{formError}</p>
        )}
        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            className="btn-styled rounded-full w-auto px-5 py-2 text-sm"
          >
            Submit Review
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-3">
        {reviews.length ? (
          reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-[var(--brand-deep)]">{review.author}</p>
                <p className="text-sm text-[var(--ink-soft)]">{new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[var(--accent)]">
                {[1, 2, 3, 4, 5].map((value) => (
                  <svg
                    key={value}
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 ${value <= review.rating ? "fill-current" : "fill-none stroke-current opacity-50"}`}
                    strokeWidth="1.8"
                  >
                    <path d="M12 3.6l2.63 5.33 5.88.85-4.26 4.15 1 5.86L12 17.02 6.75 19.79l1-5.86-4.26-4.15 5.88-.85L12 3.6z" />
                  </svg>
                ))}
              </div>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{review.comment}</p>
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-black/15 bg-white px-4 py-3 text-sm text-[var(--ink-soft)]">
            No user reviews yet. Be the first to rate this product.
          </p>
        )}
      </div>
    </section>
  );
}
