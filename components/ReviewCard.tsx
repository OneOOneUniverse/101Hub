"use client";

import { useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";

export type Reaction = {
  reaction_type: "like" | "helpful" | "love";
  user_id: string;
};

export type Reply = {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  created_at: string;
};

export type Review = {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  rating: number;
  created_at: string;
  general_review_reactions: Reaction[];
  general_review_replies: Reply[];
};

type Props = {
  review: Review;
  isAdmin: boolean;
  onDeleted: (id: string) => void;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const REACTION_LABELS: Record<string, string> = {
  like: "👍",
  helpful: "💡",
  love: "❤️",
};

export default function ReviewCard({ review, isAdmin, onDeleted }: Props) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [reactions, setReactions] = useState<Reaction[]>(review.general_review_reactions);
  const [replies, setReplies] = useState<Reply[]>(review.general_review_replies);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [togglingReaction, setTogglingReaction] = useState<string | null>(null);
  const [deletingReview, setDeletingReview] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // Count reactions by type
  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] ?? 0) + 1;
    return acc;
  }, {});

  const userReacted = (type: string) =>
    userId ? reactions.some((r) => r.user_id === userId && r.reaction_type === type) : false;

  const shareUrl = `https://www.101hub.shop/reviews#review-${review.id}`;
  const shareText = `${'⭐'.repeat(review.rating)} "${review.content.length > 120 ? review.content.slice(0, 120) + '…' : review.content}" — ${review.user_name} | Shared from 101Hub`;

  function handleCopyLink() {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "101Hub Review", text: shareText, url: shareUrl });
      } catch {
        // user cancelled or not supported
      }
    } else {
      setShowShare(true);
    }
  }

  async function toggleReaction(type: "like" | "helpful" | "love") {
    if (!userId) return;
    setTogglingReaction(type);
    try {
      const res = await fetch(`/api/reviews/${review.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: type }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { toggled: "added" | "removed"; reaction: string };
      if (json.toggled === "added") {
        setReactions((prev) => [...prev, { reaction_type: type, user_id: userId }]);
      } else {
        setReactions((prev) =>
          prev.filter((r) => !(r.user_id === userId && r.reaction_type === type))
        );
      }
    } finally {
      setTogglingReaction(null);
    }
  }

  async function submitReply() {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    setReplyError("");
    try {
      const res = await fetch(`/api/reviews/${review.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      const json = await res.json() as { reply?: Reply; error?: string };
      if (!res.ok) {
        setReplyError(json.error ?? "Failed to post reply");
        return;
      }
      if (json.reply) {
        setReplies((prev) => [...prev, json.reply!]);
        setReplyText("");
        setShowReplies(true);
      }
    } finally {
      setSubmittingReply(false);
    }
  }

  async function deleteReview() {
    setDeletingReview(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deletionReason }),
      });
      if (res.ok) {
        onDeleted(review.id);
      }
    } finally {
      setDeletingReview(false);
      setShowDeleteConfirm(false);
    }
  }

  async function deleteReply(replyId: string) {
    const res = await fetch(`/api/reviews/${review.id}/replies/${replyId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    }
  }

  return (
    <article id={`review-${review.id}`} className="panel p-4 sm:p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {review.user_avatar ? (
            <Image
              src={review.user_avatar}
              alt={review.user_name}
              width={40}
              height={40}
              className="rounded-full shrink-0 border border-black/10"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-bold text-sm">
              {review.user_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[var(--ink)] truncate">{review.user_name}</p>
            <p className="text-xs text-[var(--ink-soft)]">{timeAgo(review.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StarRating rating={review.rating} />
          {isAdmin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="ml-1 rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-[var(--ink)] leading-relaxed">{review.content}</p>

      {/* Reactions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {(["like", "helpful", "love"] as const).map((type) => (
          <button
            key={type}
            disabled={!userId || togglingReaction === type}
            onClick={() => void toggleReaction(type)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
              userReacted(type)
                ? "bg-[var(--brand)] border-[var(--brand)] text-white"
                : "bg-white border-black/10 text-[var(--ink-soft)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            } disabled:opacity-50`}
          >
            <span>{REACTION_LABELS[type]}</span>
            <span>{reactionCounts[type] ?? 0}</span>
          </button>
        ))}

        {/* Toggle replies */}
        <button
          onClick={() => setShowReplies((v) => !v)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border border-black/10 bg-white text-[var(--ink-soft)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </button>

        {/* Share button */}
        <button
          onClick={() => void handleNativeShare()}
          className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border border-black/10 bg-white text-[var(--ink-soft)] hover:border-blue-400 hover:text-blue-500 transition-all"
          title="Share this review"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
      </div>

      {/* Delete confirm (admin) */}
      {showDeleteConfirm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-700">Remove this review?</p>
          <textarea
            value={deletionReason}
            onChange={(e) => setDeletionReason(e.target.value)}
            placeholder="Reason for removal (optional)"
            rows={2}
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-[var(--ink)] resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void deleteReview()}
              disabled={deletingReview}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deletingReview ? "Removing…" : "Yes, Remove"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-[var(--ink-soft)] hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className="space-y-3 border-t border-black/05 pt-3">
          {replies.length === 0 && (
            <p className="text-xs text-[var(--ink-soft)] text-center py-2">No replies yet.</p>
          )}
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-2.5">
              {reply.user_avatar ? (
                <Image
                  src={reply.user_avatar}
                  alt={reply.user_name}
                  width={28}
                  height={28}
                  className="rounded-full shrink-0 border border-black/10 mt-0.5"
                />
              ) : (
                <div className="h-7 w-7 shrink-0 rounded-full bg-[var(--ink-soft)] flex items-center justify-center text-white font-bold text-xs mt-0.5">
                  {reply.user_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-[var(--ink)]">{reply.user_name}</span>
                  <span className="text-xs text-[var(--ink-soft)]">{timeAgo(reply.created_at)}</span>
                  {isAdmin && (
                    <button
                      onClick={() => void deleteReply(reply.id)}
                      className="ml-auto text-xs text-red-500 hover:text-red-700"
                    >
                      remove
                    </button>
                  )}
                </div>
                <p className="text-sm text-[var(--ink)] leading-relaxed mt-0.5">{reply.content}</p>
              </div>
            </div>
          ))}

          {/* Reply input */}
          {userId && (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitReply(); } }}
                placeholder="Write a reply…"
                maxLength={1000}
                className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)]"
              />
              <button
                onClick={() => void submitReply()}
                disabled={submittingReply || !replyText.trim()}
                className="rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50 transition-colors"
              >
                {submittingReply ? "…" : "Send"}
              </button>
            </div>
          )}
          {replyError && <p className="text-xs text-red-600">{replyError}</p>}
        </div>
      )}

      {/* ── Share modal ───────────────────────────────────────────── */}
      {showShare && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowShare(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                  <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white">Share Review</span>
              </div>
              <button onClick={() => setShowShare(false)} className="text-white/50 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Preview card */}
            <div className="bg-white px-5 pt-4 pb-3">
              <div className="rounded-xl border border-black/8 bg-gray-50 p-4 space-y-2">
                <div className="flex items-center gap-2.5">
                  {review.user_avatar ? (
                    <Image src={review.user_avatar} alt={review.user_name} width={32} height={32} className="rounded-full shrink-0 border border-black/10" />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-bold text-xs">
                      {review.user_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink)]">{review.user_name}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <svg key={s} className={`h-3 w-3 ${s <= review.rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[var(--ink)] leading-relaxed line-clamp-3">{review.content}</p>
                <div className="flex items-center gap-1.5 pt-1 border-t border-black/6">
                  <svg className="h-3 w-3 text-[var(--brand)]" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-[10px] font-bold text-[var(--brand)]">Shared from 101Hub</span>
                </div>
              </div>
            </div>

            {/* Platform buttons */}
            <div className="bg-white px-5 pb-4 grid grid-cols-3 gap-2.5">
              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShare(false)}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 p-3 hover:bg-[#25D366]/20 transition-colors"
              >
                <svg className="h-6 w-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.528 5.858L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.213-3.728.972.997-3.623-.235-.372A9.818 9.818 0 1112 21.818z" />
                </svg>
                <span className="text-[10px] font-semibold text-[#25D366]">WhatsApp</span>
              </a>

              {/* Twitter / X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShare(false)}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-black/5 border border-black/10 p-3 hover:bg-black/10 transition-colors"
              >
                <svg className="h-6 w-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.213 5.567 5.951-5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-[10px] font-semibold text-black">Twitter / X</span>
              </a>

              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShare(false)}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 p-3 hover:bg-[#1877F2]/20 transition-colors"
              >
                <svg className="h-6 w-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="text-[10px] font-semibold text-[#1877F2]">Facebook</span>
              </a>
            </div>

            {/* Copy link */}
            <div className="bg-white px-5 pb-5">
              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                  copied
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-black/10 bg-gray-50 text-[var(--ink)] hover:border-[var(--brand)] hover:bg-[var(--brand)]/5"
                }`}
              >
                {copied ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Link Copied!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
