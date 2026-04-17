"use client";

import { useEffect, useState } from "react";

type ServiceRequest = {
  id: number;
  ticket_ref: string;
  package_name: string;
  customer_name: string;
  customer_phone: string;
  issue: string;
  preferred_time: string | null;
  requested_date: string | null;
  status: string;
  created_at: string;
};

type StatusKey = "pending" | "approved" | "declined" | "completed" | "assigned" | "cancelled";

const STATUS_CONFIG: Record<StatusKey, { bg: string; text: string; emoji: string; label: string }> = {
  pending:   { bg: "bg-yellow-100", text: "text-yellow-800", emoji: "⏳", label: "Pending" },
  approved:  { bg: "bg-blue-100",   text: "text-blue-800",   emoji: "✅", label: "Approved" },
  declined:  { bg: "bg-red-100",    text: "text-red-800",    emoji: "✗",  label: "Declined" },
  completed: { bg: "bg-green-100",  text: "text-green-800",  emoji: "🎉", label: "Completed" },
  assigned:  { bg: "bg-indigo-100", text: "text-indigo-800", emoji: "👤", label: "Assigned" },
  cancelled: { bg: "bg-gray-100",   text: "text-gray-800",   emoji: "❌", label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${cfg.bg} px-2.5 py-1 text-xs font-bold ${cfg.text}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function ServiceRequestsDashboard() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | StatusKey>("all");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/service-requests");
      const data = (await res.json()) as { requests: ServiceRequest[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not load service requests");
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load service requests");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(ticketRef: string, status: string) {
    setUpdating(ticketRef);
    setError("");
    try {
      const res = await fetch("/api/admin/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketRef, status }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update request");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update request");
    } finally {
      setUpdating(null);
    }
  }

  // ── Counts for summary cards ──
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;
  const declinedCount = requests.filter((r) => r.status === "declined").length;

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="panel p-5 sm:p-6">
        <h2 className="text-2xl font-black text-[var(--brand-deep)]">🔧 Service Requests</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Manage incoming service bookings — approve, decline, or mark complete.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", count: pendingCount, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
          { label: "Approved", count: approvedCount, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
          { label: "Completed", count: completedCount, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
          { label: "Declined", count: declinedCount, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-4 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs font-semibold text-[var(--ink-soft)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "approved", "completed", "declined"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filter === tab
                ? "bg-[var(--brand-deep)] text-white"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-soft)] hover:bg-[var(--brand)]/10"
            }`}
          >
            {tab === "all" ? `All (${requests.length})` : `${tab.charAt(0).toUpperCase() + tab.slice(1)} (${requests.filter((r) => r.status === tab).length})`}
          </button>
        ))}
      </div>

      {/* ── Loading / Empty States ── */}
      {loading && (
        <div className="panel p-6 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="panel p-6 text-center text-[var(--ink-soft)]">
          {filter === "all"
            ? "✅ No service requests yet"
            : `No ${filter} requests`}
        </div>
      )}

      {/* ── Request Cards ── */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isPending = req.status === "pending";
            const isUpdating = updating === req.ticket_ref;

            return (
              <article
                key={req.id}
                className={`panel p-4 sm:p-5 border-l-4 ${
                  isPending
                    ? "border-l-yellow-400"
                    : req.status === "approved"
                    ? "border-l-blue-400"
                    : req.status === "completed"
                    ? "border-l-green-400"
                    : "border-l-red-300"
                }`}
              >
                {/* Top row: ticket + status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-[var(--ink-soft)]">{req.ticket_ref}</p>
                    <h3 className="text-base font-bold text-[var(--ink)] truncate">{req.package_name}</h3>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                {/* Customer info grid */}
                <div className="grid gap-2 sm:grid-cols-2 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    <span className="font-semibold text-[var(--ink)]">{req.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">📞</span>
                    <a href={`tel:${req.customer_phone}`} className="text-blue-600 font-medium hover:underline">
                      {req.customer_phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    <span className="text-[var(--ink)]">{formatDate(req.requested_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🕐</span>
                    <span className="text-[var(--ink)]">{req.preferred_time || "Not specified"}</span>
                  </div>
                </div>

                {/* Customer notes */}
                <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3 mb-3">
                  <p className="text-xs font-semibold text-[var(--ink-soft)] mb-1">Customer Notes</p>
                  <p className="text-sm text-[var(--ink)]">{req.issue}</p>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-[var(--ink-soft)] mb-3">
                  Received: {new Date(req.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>

                {/* ── Action Buttons ── */}
                <div className="flex flex-wrap gap-2">
                  {isPending && (
                    <>
                      <button
                        onClick={() => updateStatus(req.ticket_ref, "approved")}
                        disabled={isUpdating}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isUpdating ? "..." : "✅ Approve"}
                      </button>
                      <button
                        onClick={() => updateStatus(req.ticket_ref, "declined")}
                        disabled={isUpdating}
                        className="rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        {isUpdating ? "..." : "✗ Decline"}
                      </button>
                    </>
                  )}
                  {req.status === "approved" && (
                    <button
                      onClick={() => updateStatus(req.ticket_ref, "completed")}
                      disabled={isUpdating}
                      className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {isUpdating ? "..." : "🎉 Mark Complete"}
                    </button>
                  )}
                  {/* WhatsApp quick message */}
                  <a
                    href={`https://wa.me/${req.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hi ${req.customer_name}, regarding your service request (${req.ticket_ref}) for "${req.package_name}" — `
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-green-100 px-4 py-2 text-xs font-bold text-green-700 hover:bg-green-200 transition-colors"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
