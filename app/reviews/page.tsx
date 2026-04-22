"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import ReviewCard, { type Review } from "@/components/ReviewCard";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "top", label: "Most Liked" },
] as const;

type Sort = (typeof SORT_OPTIONS)[number]["value"];

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

function StarIcon({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <svg
      className={`transition-all duration-150 ${filled ? "text-amber-400" : "text-gray-200"}`}
      style={{ width: size, height: size }}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className={`transition-transform ${star <= (hover || value) ? "scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" : "hover:scale-105"}`}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            <StarIcon filled={star <= (hover || value)} size={36} />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <span className="text-sm font-bold text-amber-600">
          {RATING_LABELS[hover || value]}
        </span>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const metadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const isAdmin =
    typeof metadata.role === "string" &&
    ["admin", "supervisor"].includes(metadata.role.toLowerCase());

  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [hasMore, setHasMore] = useState(true);

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
        setReviews((prev) =>
          append ? [...prev, ...json.reviews] : json.reviews
        );
        setHasMore(
          append
            ? reviews.length + json.reviews.length < json.total
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

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reviews.filter((r) => r.rating === s).length,
  }));

  return (
    <div className="space-y-6 py-4 sm:py-6">
      {/* ── Hero Header ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-[var(--brand)]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-sm">
              ⭐ Community Reviews
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight">What People Are Saying</h1>
            <p className="mt-1.5 text-sm text-white/50 max-w-xs">
              Honest reviews from real 101 Hub customers
            </p>
          </div>

          {!loading && reviews.length > 0 && (
            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1 shrink-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-black text-amber-400 leading-none">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-white/40 text-sm self-end pb-1">/ 5</span>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <StarIcon key={s} filled={s <= Math.round(avgRating)} size={16} />
                ))}
              </div>
              <span className="text-xs text-white/40 sm:text-right">
                {total} review{total !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Rating distribution bars */}
        {!loading && reviews.length > 0 && (
          <div className="relative z-10 mt-5 space-y-1.5">
            {ratingCounts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-2 text-xs text-white/50 text-right shrink-0">{star}</span>
                <StarIcon filled size={11} />
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400/80 transition-all duration-700"
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-5 text-right text-xs text-white/30 shrink-0">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sign-in prompt ─────────────────────────────────────────── */}
      {isLoaded && !userId && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-7 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[var(--ink)]">Share Your Experience</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Sign in to leave a review and help others discover 101 Hub
            </p>
          </div>
          <a
            href="/login"
            className="inline-block rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-7 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-amber-300/50 hover:shadow-lg transition-all active:scale-95"
          >
            Sign in to Write a Review
          </a>
        </div>
      )}

      {/* ── Write a review form ─────────────────────────────────────── */}
      {isLoaded && userId && (
        <div ref={formRef} className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
          {/* Card header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#0f172a] to-[#1e293b] px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20">
              <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Write a Review</h2>
              <p className="text-xs text-white/40">Your feedback helps others make better decisions</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Star rating */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Overall Rating <span className="text-red-500">*</span>
              </p>
              <StarPicker value={formRating} onChange={setFormRating} />
            </div>

            {/* Review text */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Your Review <span className="text-red-500">*</span>
              </p>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Tell others about your experience — what you loved, what helped, or anything on your mind…"
                rows={4}
                maxLength={2000}
                className="w-full rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-3 text-sm text-[var(--ink)] placeholder-[var(--ink-soft)]/50 resize-none focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
              />
              {/* Character progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-0.5 rounded-full bg-black/8 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      formContent.length > 1800
                        ? "bg-red-400"
                        : formContent.length > 1200
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                    style={{ width: `${(formContent.length / 2000) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--ink-soft)] tabular-nums shrink-0">
                  {formContent.length}/2000
                </span>
              </div>
            </div>

            {/* Error / Success */}
            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
                <svg className="mt-0.5 h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                <p className="text-xs font-semibold text-red-700">{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                <svg className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-semibold text-emerald-700">
                  Review submitted — thank you for sharing your experience!
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-black/6">
              <p className="text-xs text-[var(--ink-soft)]">
                {formRating === 0
                  ? "Select a rating above to continue"
                  : formContent.length < 10
                  ? `${10 - formContent.length} more character${10 - formContent.length !== 1 ? "s" : ""} needed`
                  : "✓ Ready to submit"}
              </p>
              <button
                onClick={() => void submitReview()}
                disabled={submitting}
                className="rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-deep)] px-7 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-[var(--brand)]/30 hover:shadow-lg disabled:opacity-50 transition-all active:scale-95"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting…
                  </span>
                ) : (
                  "Submit Review"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sort bar ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[var(--brand)]" />
          <p className="text-sm font-bold text-[var(--ink)]">
            {loading ? "Loading reviews…" : `${total} Review${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-0.5 rounded-xl bg-black/5 p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                sort === opt.value
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Reviews list ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-black/8 bg-white p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gray-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-28 rounded-full bg-gray-200" />
                  <div className="h-2.5 w-20 rounded-full bg-gray-100" />
                </div>
                <div className="h-5 w-20 rounded-full bg-gray-100" />
              </div>
              <div className="space-y-2">
                <div className="h-2.5 w-full rounded-full bg-gray-100" />
                <div className="h-2.5 w-4/5 rounded-full bg-gray-100" />
                <div className="h-2.5 w-3/5 rounded-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 p-14 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[var(--ink)]">No reviews yet</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Be the first to share your experience with 101 Hub!
            </p>
          </div>
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
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-full border-2 border-black/10 bg-white px-7 py-2.5 text-sm font-bold text-[var(--ink)] hover:border-black/20 hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
              >
                {loadingMore ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading more…
                  </>
                ) : (
                  "Load More Reviews"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
