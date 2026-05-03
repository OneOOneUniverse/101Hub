"use client";

import { useEffect, useState } from "react";

// ── SVG Icons ──────────────────────────────────────────────────────────────
function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function CheckCircleIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
function XCircleIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}
function PartyIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;
}
function UserIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function PhoneIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.64A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.93a16 16 0 006.16 6.16l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
}
function CalendarIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function TimeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function WrenchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
}
function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function MessageIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
}
function AssignedIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
}

type ServiceRequest = {
  id: number;
  ticket_ref: string;
  package_name: string;
  customer_name: string;
  customer_phone: string;
  issue: string;
  preferred_time: string | null;
  requested_date: string | null;
  payment_proof: string | null;
  status: string;
  created_at: string;
};

type StatusKey = "pending" | "approved" | "declined" | "completed" | "assigned" | "cancelled";

const STATUS_CONFIG: Record<StatusKey, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  pending:   { bg: "bg-yellow-100", text: "text-yellow-800", icon: <ClockIcon />,    label: "Pending" },
  approved:  { bg: "bg-blue-100",   text: "text-blue-800",   icon: <CheckCircleIcon />, label: "Approved" },
  declined:  { bg: "bg-red-100",    text: "text-red-800",    icon: <XCircleIcon />,  label: "Declined" },
  completed: { bg: "bg-green-100",  text: "text-green-800",  icon: <PartyIcon />,   label: "Completed" },
  assigned:  { bg: "bg-indigo-100", text: "text-indigo-800", icon: <AssignedIcon />, label: "Assigned" },
  cancelled: { bg: "bg-gray-100",   text: "text-gray-800",   icon: <XCircleIcon />, label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${cfg.bg} px-2.5 py-1 text-xs font-bold ${cfg.text}`}>
      {cfg.icon} {cfg.label}
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
  const [proofModal, setProofModal] = useState<string | null>(null);

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
      {/* Payment Proof Modal */}
      {proofModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setProofModal(null)}
        >
          <div className="relative max-h-[90vh] max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={proofModal}
              alt="Payment proof"
              className="max-h-[80vh] w-auto rounded-lg object-contain shadow-2xl"
            />
            <button
              onClick={() => setProofModal(null)}
              className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-gray-800 shadow hover:bg-gray-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="panel p-5 sm:p-6">
        <h2 className="text-2xl font-black text-[var(--brand-deep)] flex items-center gap-2"><WrenchIcon /> Service Requests</h2>
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
            ? "No service requests yet"
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
                    <UserIcon />
                    <span className="font-semibold text-[var(--ink)]">{req.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon />
                    <a href={`tel:${req.customer_phone}`} className="text-blue-600 font-medium hover:underline">
                      {req.customer_phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon />
                    <span className="text-[var(--ink)]">{formatDate(req.requested_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TimeIcon />
                    <span className="text-[var(--ink)]">{req.preferred_time || "Not specified"}</span>
                  </div>
                </div>

                {/* Customer notes */}
                <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3 mb-3">
                  <p className="text-xs font-semibold text-[var(--ink-soft)] mb-1">Customer Notes</p>
                  <p className="text-sm text-[var(--ink)]">{req.issue}</p>
                </div>

                {/* Payment Proof */}
                {req.payment_proof ? (
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={req.payment_proof}
                      alt="Payment proof thumbnail"
                      className="h-14 w-14 rounded-lg border border-[var(--border)] object-cover cursor-pointer"
                      onClick={() => setProofModal(req.payment_proof!)}
                    />
                    <div>
                      <p className="text-xs font-semibold text-green-700 flex items-center gap-1"><CheckCircleIcon /> Payment proof attached</p>
                      <button
                        type="button"
                        onClick={() => setProofModal(req.payment_proof!)}
                        className="mt-0.5 text-xs font-bold text-blue-600 hover:underline"
                      >
                        View Full Screenshot →
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-xs font-semibold text-red-600 flex items-center gap-1"><AlertIcon /> No payment proof uploaded</p>
                )}

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
                        {isUpdating ? "..." : <span className="flex items-center gap-1"><CheckCircleIcon /> Approve</span>}
                      </button>
                      <button
                        onClick={() => updateStatus(req.ticket_ref, "declined")}
                        disabled={isUpdating}
                        className="rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        {isUpdating ? "..." : <span className="flex items-center gap-1"><XCircleIcon /> Decline</span>}
                      </button>
                    </>
                  )}
                  {req.status === "approved" && (
                    <button
                      onClick={() => updateStatus(req.ticket_ref, "completed")}
                      disabled={isUpdating}
                      className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {isUpdating ? "..." : <span className="flex items-center gap-1"><PartyIcon /> Mark Complete</span>}
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
                    <span className="flex items-center gap-1"><MessageIcon /> WhatsApp</span>
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
