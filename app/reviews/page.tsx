"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import ReviewCard, { type Review } from "@/components/ReviewCard";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "top", label: "Most Liked" },
] as const;

type Sort = (typeof SORT_OPTIONS)[number]["value"];

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform active:scale-110"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <svg
            className={`h-7 w-7 transition-colors ${
              star <= (hover || value) ? "text-amber-400" : "text-gray-200"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const metadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const isAdmin = typeof metadata.role === "string" && ["admin", "supervisor"].includes(metadata.role.toLowerCase());

  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [hasMore, setHasMore] = useState(true);

  // Form state
  const [formContent, setFormContent] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const loadReviews = useCallback(
    async (pageNum: number, sortVal: Sort, append: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetch(`/api/reviews?page=${pageNum}&sort=${sortVal}`);
        const json = (await res.json()) as {
          reviews: Review[];
          total: number;
          pageSize: number;
        };
        setTotal(json.total);
        setReviews((prev) => (append ? [...prev, ...json.reviews] : json.reviews));
        setHasMore(
          append
            ? (reviews.length + json.reviews.length) < json.total
            : json.reviews.length < json.total
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    setPage(1);
    void loadReviews(1, sort, false);
  }, [sort, loadReviews]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    void loadReviews(next, sort, true);
  }

  async function submitReview() {
    setFormError("");
    if (formRating === 0) {
      setFormError("Please select a star rating.");
      return;
    }
    if (formContent.trim().length < 10) {
      setFormError("Review must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: formContent.trim(), rating: formRating }),
      });
      const json = (await res.json()) as { review?: Review; error?: string };
      if (!res.ok) {
        setFormError(json.error ?? "Failed to submit review");
        return;
      }
      if (json.review) {
        setReviews((prev) => [
          {
            ...json.review!,
            general_review_reactions: [],
            general_review_replies: [],
          },
          ...prev,
        ]);
        setTotal((t) => t + 1);
        setFormContent("");
        setFormRating(0);
        setFormSuccess(true);
        setTimeout(() => setFormSuccess(false), 4000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleted(id: string) {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  // Average rating
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-6 py-4 sm:py-6">
      {/* Page header */}
      <div className="panel p-5 sm:p-7 text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)]">Community Reviews</h1>
        <p className="text-sm text-[var(--ink-soft)] max-w-md mx-auto">
          Share your experience with 101 Hub — what you love, what helped, or anything on your mind.
        </p>
        {!loading && reviews.length > 0 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  className={`h-5 w-5 ${s <= Math.round(avgRating) ? "text-amber-400" : "text-gray-200"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-bold text-[var(--ink)]">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-[var(--ink-soft)]">({total} review{total !== 1 ? "s" : ""})</span>
          </div>
        )}
      </div>

      {/* Write a review */}
      {isLoaded && !userId && (
        <div className="panel p-5 text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--ink)]">Want to leave a review?</p>
          <a
            href="/login"
            className="inline-block rounded-full bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] transition-colors"
          >
            Sign in to write a review
          </a>
        </div>
      )}

      {isLoaded && userId && (
        <div ref={formRef} className="panel p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-[var(--ink)]">Write a Review</h2>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide">Your Rating</p>
            <StarPicker value={formRating} onChange={setFormRating} />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide">Your Experience</p>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Tell others about your experience with 101 Hub…"
              rows={4}
              maxLength={2000}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--ink)] placeholder-[var(--ink-soft)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)]"
            />
            <p className="text-xs text-[var(--ink-soft)] text-right">{formContent.length}/2000</p>
          </div>

          {formError && <p className="text-xs font-semibold text-red-600">{formError}</p>}
          {formSuccess && (
            <p className="text-xs font-semibold text-emerald-600">Review submitted — thank you!</p>
          )}

          <button
            onClick={() => void submitReview()}
            disabled={submitting}
            className="w-full sm:w-auto rounded-full bg-[var(--brand)] px-8 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50 transition-all active:scale-95"
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      )}

      {/* Sort bar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ink)]">
          {loading ? "Loading…" : `${total} Review${total !== 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-1 rounded-xl border border-black/10 bg-white p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                sort === opt.value
                  ? "bg-[var(--brand)] text-white"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="panel p-5 animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-2 w-16 rounded bg-gray-100" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-gray-100" />
              <div className="h-3 w-3/4 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="panel p-10 text-center space-y-2">
          <svg className="h-12 w-12 text-gray-200 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <p className="text-sm font-semibold text-[var(--ink-soft)]">No reviews yet</p>
          <p className="text-xs text-[var(--ink-soft)]">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
            />
          ))}

          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-black/10 bg-white px-8 py-2.5 text-sm font-semibold text-[var(--ink-soft)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-50 transition-all"
              >
                {loadingMore ? "Loading…" : "Load more reviews"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
