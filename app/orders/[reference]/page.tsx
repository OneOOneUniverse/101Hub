"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BoxIcon } from "@/components/Icons";
import CustomerOrderMessages from "@/components/CustomerOrderMessages";
import {
  getOrderFromLocal,
  saveOrderToLocal,
  getOrderStatusLabel,
  getOrderStatusColor,
  getOrderStatusDescription,
  getOrderTimeline,
  getPaymentMethodDisplay,
  canCancelOrder,
  formatOrderDate,
  formatEstimatedDelivery,
  type OrderData,
} from "@/lib/order-status";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderRef = params.reference as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [showConfirmDelivery, setShowConfirmDelivery] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      const local = getOrderFromLocal(orderRef);
      if (local) {
        setOrder(local);
        setLoading(false);
      }
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderRef)}`);
        if (res.ok) {
          const data = (await res.json()) as OrderData;
          setOrder(data);
          saveOrderToLocal(data);
        }
      } catch {
        // silently ignore network errors
      }
      setLoading(false);
    }
    void fetchOrder();
  }, [orderRef]);

  async function handleConfirmDelivery() {
    setConfirming(true);
    setConfirmError("");
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderRef)}/confirm-delivery`,
        { method: "POST" }
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setConfirmError(data.error ?? "Could not confirm delivery.");
      } else {
        setOrder((prev) => (prev ? { ...prev, orderStatus: "delivered" } : prev));
      }
    } catch {
      setConfirmError("Network error. Please try again.");
    } finally {
      setConfirming(false);
      setShowConfirmDelivery(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderRef)}/cancel`,
        { method: "POST" }
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setCancelError(data.error ?? "Could not cancel order.");
      } else {
        setOrder((prev) => (prev ? { ...prev, orderStatus: "cancelled" } : prev));
      }
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-black/8 bg-white p-6 animate-pulse space-y-3">
            <div className="h-5 w-40 rounded-full bg-gray-200" />
            <div className="h-3 w-64 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-black/8 bg-white p-8 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-black text-[var(--ink)]">Order Not Found</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Order reference <span className="font-mono font-semibold">{orderRef}</span> could not be found.
          </p>
          <p className="mt-2 text-xs text-[var(--ink-soft)]">
            Check your email confirmation or contact support.
          </p>
        </div>
        <a
          href="/products"
          className="inline-block rounded-full bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] transition-colors"
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  const timeline = getOrderTimeline(order.orderStatus);

  const statusColors: Record<string, string> = {
    cancelled: "bg-red-500",
    delivered: "bg-emerald-500",
    in_transit: "bg-blue-500",
    completed: "bg-emerald-600",
    payment_rejected: "bg-red-400",
  };
  const statusBannerClass = statusColors[order.orderStatus] ?? "bg-amber-500";

  return (
    <div className="space-y-5">

      {/* ── Order Header Card ─────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
        <div className={`${statusBannerClass} px-5 py-1.5 text-center text-xs font-bold text-white tracking-wide uppercase`}>
          {getOrderStatusLabel(order.orderStatus)}
        </div>
        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-black text-[var(--ink)]">Order Tracking</h1>
              <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--ink-soft)]">
                {order.orderRef}
              </p>
            </div>
            <span className={`inline-block rounded-full border px-3 py-1.5 text-xs font-bold ${getOrderStatusColor(order.orderStatus)}`}>
              {getOrderStatusLabel(order.orderStatus)}
            </span>
          </div>
          {getOrderStatusDescription(order.orderStatus) && (
            <p className="mt-3 rounded-xl bg-black/5 px-4 py-3 text-sm text-[var(--ink-soft)] leading-relaxed">
              {getOrderStatusDescription(order.orderStatus)}
            </p>
          )}
        </div>
      </div>

      {/* ── Orderpro-style Delivery Stepper ──────────────────────── */}
      <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-5 sm:p-7">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-5 w-1 rounded-full bg-[var(--brand)]" />
          <h2 className="text-base font-black text-[var(--ink)]">Delivery Progress</h2>
        </div>

        <div>
          {timeline.map((step, idx) => (
            <div key={step.status} className="flex gap-4">
              {/* Circle + connector line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0 font-bold ${
                    step.completed && !step.current
                      ? "bg-[#0f172a] text-white"
                      : step.current
                      ? "border-2 border-[#0f172a] bg-white text-[#0f172a]"
                      : "border-2 border-[#e2e8f0] bg-white text-[#94a3b8]"
                  }`}
                >
                  {step.completed && !step.current ? (
                    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                      <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
                    </svg>
                  ) : (
                    <span className="text-sm">{idx + 1}</span>
                  )}
                </div>
                {idx < timeline.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 min-h-[2.5rem] my-1 ${
                      step.completed ? "bg-[#0f172a]" : "bg-[#e2e8f0]"
                    }`}
                  />
                )}
              </div>

              {/* Step content */}
              <div className={`${idx < timeline.length - 1 ? "pb-7" : "pb-1"} flex-1 pt-1`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p
                    className={`font-semibold text-sm ${
                      step.completed || step.current ? "text-[#0f172a]" : "text-[#94a3b8]"
                    }`}
                  >
                    {step.label}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      step.completed && !step.current
                        ? "bg-[#dcfce7] text-[#166534]"
                        : step.current
                        ? "bg-[#dbeafe] text-[#1d4ed8]"
                        : "bg-[#f1f5f9] text-[#64748b]"
                    }`}
                  >
                    {step.completed && !step.current
                      ? "Completed"
                      : step.current
                      ? "In Progress"
                      : "Pending"}
                  </span>
                </div>
                {step.current && (
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                    This is your order&apos;s current status
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Order & Delivery Dates ──────────────────────────────────── */}
      <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-1 rounded-full bg-[var(--brand)]" />
          <h2 className="text-sm font-black text-[var(--ink)]">Order & Delivery Dates</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-[var(--ink-soft)]">Order Date</span>
            <span className="font-semibold text-right">{formatOrderDate(order.createdAt)}</span>
          </div>
          {order.estimatedDeliveryDate && (
            <div className="flex justify-between items-center border-t border-black/6 pt-3">
              <span className="text-[var(--ink-soft)]">Estimated Delivery</span>
              <span className="font-bold text-emerald-700 text-right">
                {formatEstimatedDelivery(order.estimatedDeliveryDate)}
              </span>
            </div>
          )}
          {!order.estimatedDeliveryDate &&
            order.orderStatus !== "payment_pending" &&
            order.orderStatus !== "payment_pending_admin_review" && (
              <div className="flex justify-between items-center border-t border-black/6 pt-3">
                <span className="text-[var(--ink-soft)]">Estimated Delivery</span>
                <span className="text-xs text-[var(--ink-soft)]">Being arranged…</span>
              </div>
            )}
        </div>
      </div>

      {/* ── Store Messages ─────────────────────────────────────────── */}
      <CustomerOrderMessages orderRef={order.orderRef} />

      {/* ── Payment Information ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-1 rounded-full bg-[var(--brand)]" />
          <h2 className="text-sm font-black text-[var(--ink)]">Payment</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--ink-soft)]">Method</span>
            <span className="font-semibold">{getPaymentMethodDisplay(order.paymentMethod)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--ink-soft)]">Order Total</span>
            <span className="font-bold text-base">GHS {order.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-black/6 pt-3">
            <span className="text-[var(--ink-soft)]">Payment Status</span>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                order.paymentStatus === "verified"
                  ? "bg-emerald-100 text-emerald-800"
                  : order.paymentStatus === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {order.paymentStatus === "verified"
                ? "✓ Verified"
                : order.paymentStatus === "rejected"
                ? "✕ Rejected"
                : "⏳ Pending Review"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Order Items ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-1 rounded-full bg-[var(--brand)]" />
          <h2 className="text-sm font-black text-[var(--ink)]">Order Items</h2>
        </div>
        <div className="space-y-2 text-sm">
          {order.items.map((item) => (
            <div
              key={item.name}
              className="flex justify-between items-center py-2 border-b border-black/6 last:border-b-0"
            >
              <span className="text-[var(--ink-soft)]">
                {item.name}{" "}
                <span className="font-semibold text-[var(--ink)]">× {item.qty}</span>
              </span>
              <span className="font-semibold">GHS {item.lineTotal.toFixed(2)}</span>
            </div>
          ))}

          <div className="pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--ink-soft)]">Subtotal</span>
              <span className="font-semibold">GHS {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ink-soft)]">Delivery</span>
              <span className="font-semibold">
                {order.delivery === 0 ? "Free" : `GHS ${order.delivery.toFixed(2)}`}
              </span>
            </div>
            {(order as { processingFee?: number }).processingFee != null &&
              (order as { processingFee?: number }).processingFee! > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--ink-soft)]">Processing fee</span>
                  <span className="font-semibold">
                    GHS {((order as { processingFee?: number }).processingFee!).toFixed(2)}
                  </span>
                </div>
              )}
            <div className="flex justify-between font-black text-base border-t border-black/10 pt-2 mt-1">
              <span>Total</span>
              <span className="text-[var(--brand-deep)]">GHS {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delivery Details ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-1 rounded-full bg-[var(--brand)]" />
          <h2 className="text-sm font-black text-[var(--ink)]">Delivery Details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[var(--ink-soft)] uppercase tracking-wide font-semibold mb-0.5">Name</p>
            <p className="font-semibold">{order.customerName}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-soft)] uppercase tracking-wide font-semibold mb-0.5">Phone</p>
            <p className="font-semibold">{order.customerPhone}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-[var(--ink-soft)] uppercase tracking-wide font-semibold mb-0.5">Address</p>
            <p className="font-semibold">{order.customerAddress}</p>
          </div>
          {order.customerEmail && (
            <div>
              <p className="text-xs text-[var(--ink-soft)] uppercase tracking-wide font-semibold mb-0.5">Email</p>
              <p className="font-semibold">{order.customerEmail}</p>
            </div>
          )}
          {order.customerNote && (
            <div className="sm:col-span-2">
              <p className="text-xs text-[var(--ink-soft)] uppercase tracking-wide font-semibold mb-0.5">Delivery Notes</p>
              <p className="font-semibold">{order.customerNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm Delivery ─────────────────────────────────────── */}
      {order.orderStatus === "in_transit" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-black text-emerald-900 flex items-center gap-2 mb-2">
            <BoxIcon size={20} /> Did You Receive Your Order?
          </h2>
          <p className="text-sm text-emerald-800 mb-4">
            Once the driver hands over your package, tap the button below to confirm delivery.
          </p>
          {confirmError && (
            <p className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">
              {confirmError}
            </p>
          )}
          {!showConfirmDelivery ? (
            <button
              onClick={() => setShowConfirmDelivery(true)}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              ✅ I&apos;ve Received My Order
            </button>
          ) : (
            <div className="rounded-xl bg-emerald-100 border border-emerald-300 p-4 space-y-3">
              <p className="font-bold text-emerald-900">
                Confirm you received order {orderRef}?
              </p>
              <p className="text-sm text-emerald-700">
                Make sure you&apos;ve checked all items before confirming.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => void handleConfirmDelivery()}
                  disabled={confirming}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {confirming ? "Confirming…" : "Yes, I Got It"}
                </button>
                <button
                  onClick={() => setShowConfirmDelivery(false)}
                  disabled={confirming}
                  className="rounded-full border-2 border-gray-300 px-5 py-2 text-sm font-bold text-[var(--ink)] hover:bg-white disabled:opacity-60"
                >
                  Not Yet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {order.orderStatus === "delivered" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-black text-emerald-900 flex items-center gap-2 mb-1">
            <BoxIcon size={20} /> Order Delivered!
          </h2>
          <p className="text-sm text-emerald-800">
            Your order has been delivered. Thank you for shopping with 101 Hub!
          </p>
        </div>
      )}

      {/* ── Cancel Order ─────────────────────────────────────────── */}
      {order.orderStatus !== "cancelled" && (
        <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-1 rounded-full bg-red-400" />
            <h2 className="text-sm font-black text-[var(--ink)]">Cancel Order</h2>
          </div>
          {canCancelOrder(order.orderStatus) ? (
            <>
              <p className="text-sm text-[var(--ink-soft)] mb-4">
                You can cancel this order while your payment is still under review. Once confirmed, cancellation is no longer possible.
              </p>
              {cancelError && (
                <p className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">
                  {cancelError}
                </p>
              )}
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="rounded-full border-2 border-red-300 px-5 py-2 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors"
                >
                  Cancel This Order
                </button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                  <p className="font-bold text-red-900">
                    Are you sure you want to cancel order {orderRef}?
                  </p>
                  <p className="text-sm text-red-700">This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => void handleCancel()}
                      disabled={cancelling}
                      className="rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {cancelling ? "Cancelling…" : "Yes, Cancel Order"}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancelling}
                      className="rounded-full border-2 border-gray-300 px-5 py-2 text-sm font-bold text-[var(--ink)] hover:bg-gray-50 disabled:opacity-60"
                    >
                      Keep Order
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">
                This order can no longer be cancelled — it has progressed past the review stage.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Contact support below if you have an urgent issue.
              </p>
            </div>
          )}
        </div>
      )}

      {order.orderStatus === "cancelled" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-black text-red-900 mb-1">Order Cancelled</h2>
          <p className="text-sm text-red-700">
            This order has been cancelled. If you made a payment, please contact us for a refund.
          </p>
        </div>
      )}

      {/* ── Contact Support ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-1 rounded-full bg-blue-500" />
          <h2 className="text-sm font-black text-blue-900">Need Help?</h2>
        </div>
        <p className="text-sm text-blue-800 mb-3">
          Contact our support team for any questions about your order.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="tel:+233548656980"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            📞 Call +233 548656980
          </a>
          <a
            href="mailto:josephsakyi247@gmail.com"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            ✉️ Email Support
          </a>
        </div>
      </div>

    </div>
  );
}
