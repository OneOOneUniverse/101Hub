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
  status: string;
  created_at: string;
};

function statusBadge(status: string) {
  const badges: { [key: string]: { bg: string; text: string; emoji: string } } = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-900", emoji: "⏳" },
    assigned: { bg: "bg-blue-100", text: "text-blue-900", emoji: "👤" },
    completed: { bg: "bg-green-100", text: "text-green-900", emoji: "✅" },
    cancelled: { bg: "bg-red-100", text: "text-red-900", emoji: "❌" },
  };

  const badge = badges[status] || badges.pending;

  return (
    <span className={`inline-block rounded-full ${badge.bg} px-3 py-1 text-xs font-bold ${badge.text}`}>
      {badge.emoji} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ServiceRequestsDashboard() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

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
      // Refresh list after update
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update request");
    } finally {
      setUpdating(null);
    }
  }

  const statusList = ["pending", "assigned", "completed", "cancelled"];

  return (
    <section className="panel space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--brand-deep)]">🔧 Service Requests</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Manage customer service requests and track status
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      {loading && (
        <p className="text-sm text-[var(--ink-soft)]">Loading service requests...</p>
      )}

      {!loading && requests.length === 0 && (
        <p className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
          ✅ No service requests at the moment
        </p>
      )}

      {!loading && requests.length > 0 && (
        <div className="space-y-3 overflow-x-auto">
          <table width="100%" className="text-sm">
            <thead>
              <tr className="border-b-2 border-black/10">
                <th className="p-3 text-left font-bold">Ticket</th>
                <th className="p-3 text-left font-bold">Package</th>
                <th className="p-3 text-left font-bold">Customer</th>
                <th className="p-3 text-left font-bold">Phone</th>
                <th className="p-3 text-left font-bold">Status</th>
                <th className="p-3 text-left font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b border-black/5 hover:bg-black/2">
                  <td className="p-3 font-mono text-xs">{req.ticket_ref}</td>
                  <td className="p-3">{req.package_name}</td>
                  <td className="p-3 font-semibold">{req.customer_name}</td>
                  <td className="p-3">
                    <a href={`tel:${req.customer_phone}`} className="text-blue-600 hover:underline">
                      {req.customer_phone}
                    </a>
                  </td>
                  <td className="p-3">{statusBadge(req.status)}</td>
                  <td className="p-3">
                    <select
                      value={req.status}
                      onChange={(e) => updateStatus(req.ticket_ref, e.target.value)}
                      disabled={updating === req.ticket_ref}
                      className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {statusList.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-[var(--ink-soft)]">
              View Details for Each Request
            </summary>
            <div className="mt-4 space-y-4">
              {requests.map((req) => (
                <article key={req.id} className="rounded-lg border border-black/10 bg-black/2 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-[var(--ink-soft)]">{req.ticket_ref}</p>
                      <p className="text-base font-bold">{req.package_name}</p>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">
                        <strong>Customer:</strong> {req.customer_name}
                      </p>
                      <p className="text-sm text-[var(--ink-soft)]">
                        <strong>Phone:</strong> {req.customer_phone}
                      </p>
                      {req.preferred_time && (
                        <p className="text-sm text-[var(--ink-soft)]">
                          <strong>Preferred Time:</strong> {req.preferred_time}
                        </p>
                      )}
                      <div className="mt-3 rounded-lg bg-white/50 p-3">
                        <p className="text-xs font-semibold text-[var(--ink-soft)]">Issue</p>
                        <p className="text-sm">{req.issue}</p>
                      </div>
                      <p className="mt-2 text-xs text-[var(--ink-soft)]">
                        Received: {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {statusBadge(req.status)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
