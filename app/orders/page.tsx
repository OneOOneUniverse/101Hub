"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BoxIcon } from "@/components/Icons";
import { getOrdersFromLocal, saveOrderToLocal, getOrderStatusLabel, getOrderStatusColor, type OrderData } from "@/lib/order-status";

export default function OrderLookupPage() {
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([]);

  // Load from localStorage only on the client to avoid hydration mismatch,
  // then refresh statuses from Supabase so admin changes are reflected immediately
  useEffect(() => {
    const orders = getOrdersFromLocal().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setRecentOrders(orders);

    // Refresh each order's status from the server in the background
    const toRefresh = orders.slice(0, 5);
    if (toRefresh.length === 0) return;

    void Promise.allSettled(
      toRefresh.map(async (order) => {
        try {
          const res = await fetch(`/api/orders/${encodeURIComponent(order.orderRef)}`);
          if (res.ok) {
            const fresh = (await res.json()) as OrderData;
            saveOrderToLocal(fresh);
            setRecentOrders((prev) =>
              prev.map((o) => (o.orderRef === fresh.orderRef ? fresh : o))
            );
          }
        } catch {
          // ignore — stale data is better than nothing
        }
      })
    );
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = ref.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter an order reference.");
      return;
    }

    setError("");
    setChecking(true);

    // Check Supabase so the lookup works even if localStorage was cleared
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        router.push(`/orders/${encodeURIComponent(trimmed)}`);
        return;
      }
      setError("Order not found. Please check the reference and try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8 px-4">
      {/* Header */}
      <section className="panel p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
          <BoxIcon size={36} />
        </div>
        <h1 className="text-3xl font-black text-[var(--brand-deep)]">Track Your Order</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Enter your order reference to see the current status of your delivery.
        </p>
      </section>

      {/* Lookup form */}
      <section className="panel p-6">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="order-ref" className="block text-sm font-bold text-[var(--ink)] mb-1">
              Order Reference
            </label>
            <input
              id="order-ref"
              type="text"
              value={ref}
              onChange={(e) => { setRef(e.target.value); setError(""); }}
              placeholder="e.g. GH-1775572945466"
              className="input-styled font-mono font-semibold"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              You can find this in your order confirmation email.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={checking}
            className="btn-styled rounded-full text-sm disabled:opacity-60"
          >
            {checking ? "Searching…" : "Track Order"}
          </button>
        </form>
      </section>

      {/* Recent orders from this browser */}
      {recentOrders.length > 0 && (
        <section className="panel p-6">
          <h2 className="text-base font-bold text-[var(--ink)] mb-3">Recent Orders (This Device)</h2>
          <div className="space-y-2">
            {recentOrders.slice(0, 5).map((order) => (
              <a
                key={order.orderRef}
                href={`/orders/${order.orderRef}`}
                className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 transition-colors"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-[var(--ink)]">{order.orderRef}</p>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}GHS {order.total.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusColor(order.orderStatus)}`}
                  >
                    {getOrderStatusLabel(order.orderStatus)}
                  </span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Help callout */}
      <section className="panel p-5 bg-blue-50 border border-blue-200">
        <p className="text-sm font-semibold text-blue-900">Can&apos;t find your order?</p>
        <p className="mt-1 text-xs text-blue-700">
          Check your email for a confirmation message with the order reference, or contact us directly.
        </p>
        <a
          href="tel:+233548656980"
          className="mt-3 inline-block rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          📞 Call Support
        </a>
      </section>
    </div>
  );
}
