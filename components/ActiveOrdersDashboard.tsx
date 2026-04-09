"use client";

import { useEffect, useState } from "react";

type ActiveOrder = {
  orderRef: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderStatus: "confirmed" | "in_transit";
  total: number;
  downpayment: number;
  createdAt: string;
};

function statusBadge(status: string) {
  if (status === "in_transit")
    return (
      <span className="inline-block rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-900">
        🚚 Out for Delivery
      </span>
    );
  return (
    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">
      🎉 Confirmed
    </span>
  );
}

export default function ActiveOrdersDashboard() {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
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
      const res = await fetch("/api/admin/active-orders");
      const data = (await res.json()) as { orders: ActiveOrder[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not load active orders");
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load active orders");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderRef: string, status: "in_transit" | "delivered") {
    setUpdating(orderRef);
    setError("");
    try {
      const res = await fetch("/api/admin/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef, status }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update order");
      // Refresh list after update
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setUpdating(null);
    }
  }

  const confirmed = orders.filter((o) => o.orderStatus === "confirmed");
  const inTransit = orders.filter((o) => o.orderStatus === "in_transit");

  return (
    <section className="panel space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--brand-deep)]">🚚 Active Orders</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Manage confirmed orders and delivery status
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      {loading && (
        <p className="text-sm text-[var(--ink-soft)]">Loading active orders...</p>
      )}

      {!loading && orders.length === 0 && (
        <p className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
          ✅ No active orders at the moment
        </p>
      )}

      {/* Confirmed — ready to dispatch */}
      {confirmed.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-[var(--ink)]">
            Confirmed — Ready to Dispatch ({confirmed.length})
          </h3>
          {confirmed.map((order) => (
            <article
              key={order.orderRef}
              className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-bold text-[var(--ink)]">{order.customerName}</p>
                  <p className="text-sm text-[var(--ink-soft)]">{order.customerPhone}</p>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">{order.customerAddress}</p>
                  <p className="font-mono text-xs text-blue-800 mt-1">{order.orderRef}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-blue-900">GHS {order.total.toFixed(2)}</p>
                  {statusBadge(order.orderStatus)}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => void updateStatus(order.orderRef, "in_transit")}
                  disabled={updating === order.orderRef}
                  className="flex-1 rounded-full bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-60"
                >
                  {updating === order.orderRef ? "Updating..." : "🚚 Mark Out for Delivery"}
                </button>
                <a
                  href={`tel:${order.customerPhone.replace(/\D/g, "")}`}
                  className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 text-center"
                >
                  📞 Call Customer
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* In Transit — out for delivery */}
      {inTransit.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-[var(--ink)]">
            Out for Delivery ({inTransit.length})
          </h3>
          {inTransit.map((order) => (
            <article
              key={order.orderRef}
              className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-bold text-[var(--ink)]">{order.customerName}</p>
                  <p className="text-sm text-[var(--ink-soft)]">{order.customerPhone}</p>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">{order.customerAddress}</p>
                  <p className="font-mono text-xs text-cyan-800 mt-1">{order.orderRef}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-cyan-900">GHS {order.total.toFixed(2)}</p>
                  {statusBadge(order.orderStatus)}
                </div>
              </div>
              <p className="text-xs text-cyan-700 bg-cyan-100 rounded-lg px-3 py-2">
                💵 Collect GHS {(order.total - order.downpayment).toFixed(2)} remaining balance on delivery
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => void updateStatus(order.orderRef, "delivered")}
                  disabled={updating === order.orderRef}
                  className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {updating === order.orderRef ? "Updating..." : "📦 Mark as Delivered"}
                </button>
                <a
                  href={`tel:${order.customerPhone.replace(/\D/g, "")}`}
                  className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 text-center"
                >
                  📞 Call Customer
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
