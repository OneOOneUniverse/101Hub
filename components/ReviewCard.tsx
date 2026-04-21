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

  // Count reactions by type
  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] ?? 0) + 1;
    return acc;
  }, {});

  const userReacted = (type: string) =>
    userId ? reactions.some((r) => r.user_id === userId && r.reaction_type === type) : false;

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
    <article className="panel p-4 sm:p-5 space-y-3">
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
          className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border border-black/10 bg-white text-[var(--ink-soft)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
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
    </article>
  );
}
