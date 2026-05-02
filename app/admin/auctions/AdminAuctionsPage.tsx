"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Auction = {
  id: number;
  title: string;
  description: string;
  image_url: string;
  starting_price: number;
  reserve_price: number | null;
  current_bid: number;
  bid_count: number;
  min_increment: number;
  winner_name: string | null;
  winner_email: string | null;
  ends_at: string;
  status: "active" | "ended" | "cancelled";
  created_at: string;
};

// ── SVG icons ────────────────────────────────────────────────────────────────
function GavelIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 4l5 5-9.5 9.5-5-5z" /><line x1="3" y1="21" x2="9.5" y2="14.5" />
    </svg>
  );
}
function PlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function PencilIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function BanIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>;
}
function RefreshIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Auction["status"] }) {
  const styles = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ended: "bg-gray-100 text-gray-600 border-gray-200",
    cancelled: "bg-red-100 text-red-600 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status]}`}>
      {status}
    </span>
  );
}

const EMPTY_FORM = {
  title: "",
  description: "",
  image_url: "",
  starting_price: "",
  reserve_price: "",
  min_increment: "1",
  ends_at: "",
};

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: number; msg: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auctions");
      const data = (await res.json()) as Auction[];
      setAuctions(Array.isArray(data) ? data : []);
    } catch { /* keep stale */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setFormError("");
    setFormSuccess("");
    setShowForm(true);
  }

  function openEdit(a: Auction) {
    setForm({
      title: a.title,
      description: a.description,
      image_url: a.image_url,
      starting_price: String(a.starting_price),
      reserve_price: a.reserve_price != null ? String(a.reserve_price) : "",
      min_increment: String(a.min_increment),
      ends_at: new Date(a.ends_at).toISOString().slice(0, 16),
    });
    setEditId(a.id);
    setFormError("");
    setFormSuccess("");
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    const payload = {
      title: form.title,
      description: form.description,
      image_url: form.image_url,
      starting_price: parseFloat(form.starting_price),
      reserve_price: form.reserve_price ? parseFloat(form.reserve_price) : null,
      min_increment: parseFloat(form.min_increment),
      ends_at: new Date(form.ends_at).toISOString(),
    };

    try {
      const url = editId ? `/api/admin/auctions/${editId}` : "/api/admin/auctions";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFormError(data.error ?? "Failed to save auction.");
      } else {
        setFormSuccess(editId ? "Auction updated." : "Auction created successfully!");
        setForm(EMPTY_FORM);
        setEditId(null);
        setShowForm(false);
        void load();
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: number, status: "ended" | "cancelled") {
    const label = status === "ended" ? "end" : "cancel";
    if (!confirm(`Are you sure you want to ${label} this auction?`)) return;
    setActionMsg({ id, msg: "Updating…" });
    try {
      const res = await fetch(`/api/admin/auctions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionMsg({ id, msg: data.error ?? "Error" });
      } else {
        setActionMsg(null);
        void load();
      }
    } catch {
      setActionMsg({ id, msg: "Network error" });
    }
  }

  const minDatetime = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <GavelIcon size={22} />
          <h1 className="text-xl font-black">Auction Management</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink-soft)] hover:border-purple-300 hover:text-purple-700 transition-colors"
          >
            <RefreshIcon /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition-colors"
          >
            <PlusIcon /> New Auction
          </button>
        </div>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-black text-[var(--ink)]">
            {editId ? "Edit Auction" : "Create New Auction"}
          </h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={(e) => setField("title", e.target.value)} maxLength={120} required placeholder="e.g. iPhone 15 Pro Max 256GB" className="input-styled text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Description</label>
              <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} maxLength={2000} rows={3} placeholder="Describe the item…" className="input-styled text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Image URL</label>
              <input value={form.image_url} onChange={(e) => setField("image_url", e.target.value)} type="url" placeholder="https://…" className="input-styled text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Starting Price (GHS) <span className="text-red-500">*</span></label>
              <input value={form.starting_price} onChange={(e) => setField("starting_price", e.target.value)} type="number" step="0.01" min="0.01" required placeholder="0.00" className="input-styled text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                Reserve Price (GHS) <span className="font-normal text-[var(--ink-soft)]">(optional)</span>
              </label>
              <input value={form.reserve_price} onChange={(e) => setField("reserve_price", e.target.value)} type="number" step="0.01" min="0" placeholder="Leave blank if none" className="input-styled text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Min Bid Increment (GHS) <span className="text-red-500">*</span></label>
              <input value={form.min_increment} onChange={(e) => setField("min_increment", e.target.value)} type="number" step="0.01" min="0.01" required className="input-styled text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">End Date &amp; Time <span className="text-red-500">*</span></label>
              <input value={form.ends_at} onChange={(e) => setField("ends_at", e.target.value)} type="datetime-local" min={minDatetime} required className="input-styled text-sm" />
            </div>

            {formError && (
              <p className="sm:col-span-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">{formError}</p>
            )}
            {formSuccess && (
              <p className="sm:col-span-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs font-semibold text-green-700">{formSuccess}</p>
            )}

            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={submitting} className="flex items-center gap-1.5 rounded-full bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-60">
                <CheckIcon /> {submitting ? "Saving…" : editId ? "Save Changes" : "Create Auction"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[var(--ink-soft)] hover:border-red-300 hover:text-red-600">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Auction list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : auctions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/30 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center text-purple-300">
            <GavelIcon size={36} />
          </div>
          <p className="mt-3 text-sm font-bold text-[var(--ink)]">No auctions yet</p>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">Click &quot;New Auction&quot; above to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {auctions.map((a) => (
            <div key={a.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                {/* Thumbnail */}
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center text-purple-300">
                  {a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image_url} alt={a.title} className="h-full w-full object-cover" />
                  ) : (
                    <GavelIcon size={20} />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-[var(--ink)]">{a.title}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[var(--ink-soft)]">
                    <span>Start: <strong className="text-[var(--ink)]">GHS {Number(a.starting_price).toFixed(2)}</strong></span>
                    <span>Current: <strong className="text-purple-700">GHS {Number(a.current_bid || a.starting_price).toFixed(2)}</strong></span>
                    <span>Bids: <strong className="text-[var(--ink)]">{a.bid_count}</strong></span>
                    <span>Ends: <strong className="text-[var(--ink)]">{new Date(a.ends_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong></span>
                  </div>
                  {a.winner_name && (
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">Winner: {a.winner_name}</p>
                  )}
                  {actionMsg?.id === a.id && (
                    <p className="mt-0.5 text-[11px] font-semibold text-orange-600">{actionMsg.msg}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button onClick={() => openEdit(a)} className="flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--ink-soft)] hover:border-purple-300 hover:text-purple-700 transition-colors" title="Edit">
                    <PencilIcon /> Edit
                  </button>
                  {a.status === "active" && (
                    <>
                      <button onClick={() => void handleStatusChange(a.id, "ended")} className="flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--ink-soft)] hover:border-gray-400 hover:text-gray-700 transition-colors" title="End Auction">
                        <CheckIcon /> End
                      </button>
                      <button onClick={() => void handleStatusChange(a.id, "cancelled")} className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-50 transition-colors" title="Cancel Auction">
                        <BanIcon /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
