"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BoxIcon, CoinIcon } from "@/components/Icons";
import { 
  getOrderFromLocal, 
  saveOrderToLocal,
  getOrderStatusLabel, 
  getOrderStatusColor, 
  getOrderStatusDescription,
  getOrderTimeline, 
  calculateRemainingBalance,
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

      // 1. Show localStorage immediately for instant display
      const local = getOrderFromLocal(orderRef);
      if (local) {
        setOrder(local);
        setLoading(false);
      }

      // 2. Always fetch from Supabase to get the latest status (admin may have updated it)
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderRef)}`);
        if (res.ok) {
          const data = (await res.json()) as OrderData;
          setOrder(data);
          // Sync localStorage so the orders list shows the correct status
          saveOrderToLocal(data);
        }
      } catch {
        // silently ignore network errors — keep the localStorage version if we have it
      }

      setLoading(false);
    }

    void fetchOrder();
  }, [orderRef]);

  async function handleConfirmDelivery() {
    setConfirming(true);
    setConfirmError("");
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderRef)}/confirm-delivery`, {
        method: "POST",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setConfirmError(data.error ?? "Could not confirm delivery.");
      } else {
        setOrder((prev) => prev ? { ...prev, orderStatus: "delivered" } : prev);
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
      const res = await fetch(`/api/orders/${encodeURIComponent(orderRef)}/cancel`, {
        method: "POST",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setCancelError(data.error ?? "Could not cancel order.");
      } else {
        // Update local state to reflect cancellation
        setOrder((prev) => prev ? { ...prev, orderStatus: "cancelled" } : prev);
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
      <section className="panel p-6">
        <p className="text-[var(--ink-soft)]">Loading order details...</p>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Order Not Found</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Order reference <span className="font-mono font-semibold">{orderRef}</span> could not be found.
        </p>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Try checking your email for the order confirmation or contacting support.
        </p>
        <a
          href="/products"
          className="mt-4 inline-block rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
        >
          Continue Shopping
        </a>
      </section>
    );
  }

  const timeline = getOrderTimeline(order.orderStatus);
  const remainingBalance = calculateRemainingBalance(order);

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[var(--brand-deep)]">Order Status</h1>
            <p className="mt-1 font-mono text-sm font-semibold text-[var(--ink-soft)]">{order.orderRef}</p>
          </div>
          <div className={`px-4 py-2 rounded-full border font-bold text-sm ${getOrderStatusColor(order.orderStatus)}`}>
            {getOrderStatusLabel(order.orderStatus)}
          </div>
        </div>
        {getOrderStatusDescription(order.orderStatus) && (
          <p className="mt-4 rounded-xl bg-black/5 px-4 py-3 text-sm text-[var(--ink-soft)] leading-relaxed">
            {getOrderStatusDescription(order.orderStatus)}
          </p>
        )}
      </section>

      {/* Order & Delivery Dates */}
      <section className="panel p-6">
        <h2 className="text-xl font-bold mb-4">Order & Delivery Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-start">
            <span className="text-[var(--ink-soft)]">Order Date & Time</span>
            <span className="font-semibold text-right">{formatOrderDate(order.createdAt)}</span>
          </div>
          {order.estimatedDeliveryDate && (
            <div className="flex justify-between items-start border-t pt-3">
              <span className="text-[var(--ink-soft)]">Estimated Delivery</span>
              <span className="font-semibold text-right text-emerald-700">
                {formatEstimatedDelivery(order.estimatedDeliveryDate)}
              </span>
            </div>
          )}
          {!order.estimatedDeliveryDate && order.orderStatus !== "payment_pending" && order.orderStatus !== "payment_pending_admin_review" && (
            <div className="flex justify-between items-start border-t pt-3">
              <span className="text-[var(--ink-soft)]">Estimated Delivery</span>
              <span className="text-xs text-[var(--ink-soft)]">Being arranged...</span>
            </div>
          )}
        </div>
      </section>

      {/* Timeline */}
      <section className="panel p-6">
        <h2 className="text-xl font-bold mb-6">Delivery Timeline</h2>
        <div className="space-y-4">
          {timeline.map((step, idx) => (
            <div key={step.status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step.current
                      ? "bg-blue-100 text-blue-900 ring-2 ring-blue-300"
                      : step.completed
                      ? "bg-green-100 text-green-900"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {step.completed && !step.current ? "✓" : idx + 1}
                </div>
                {idx < timeline.length - 1 && (
                  <div
                    className={`w-1 h-12 mt-2 ${step.completed ? "bg-green-300" : "bg-gray-200"}`}
                  />
                )}
              </div>
              <div className="pb-4 flex-1">
                <p className="font-bold text-[var(--ink)]">{step.label}</p>
                <p className="text-sm text-[var(--ink-soft)]">
                  {step.current ? "Current status" : step.completed ? "Completed" : "Not yet reached"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payment Information */}
      <section className="panel p-6">
        <h2 className="text-xl font-bold mb-4">Payment Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--ink-soft)]">Payment Method</span>
            <span className="font-semibold">{getPaymentMethodDisplay(order.paymentMethod)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--ink-soft)]">Order Total</span>
            <span className="font-semibold">GHS {order.total.toFixed(2)}</span>
          </div>
          <div className="border-t border-black/10 pt-3"></div>
          <div className="flex justify-between">
            <span className="text-[var(--ink-soft)]">Downpayment (40%)</span>
            <span className="font-bold text-amber-900">GHS {order.downpayment.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--ink-soft)]">Payment Status</span>
            <span
              className={`font-bold px-2 py-1 rounded text-xs ${
                order.paymentStatus === "verified"
                  ? "bg-green-100 text-green-900"
                  : order.paymentStatus === "rejected"
                  ? "bg-red-100 text-red-900"
                  : "bg-yellow-100 text-yellow-900"
              }`}
            >
              {order.paymentStatus === "verified"
                ? "✓ Verified"
                : order.paymentStatus === "rejected"
                ? "✕ Rejected"
                : "⏳ Pending"}
            </span>
          </div>
          <div className="border-t border-black/10 pt-3"></div>
          <div className="flex justify-between font-bold text-base">
            <span>Remaining Balance (60%)</span>
            <span className="text-amber-900">GHS {remainingBalance.toFixed(2)}</span>
          </div>
          <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
            <CoinIcon size={14} className="shrink-0" /> This amount will be collected from you when the driver delivers your order.
          </p>
        </div>
      </section>

      {/* Order Items */}
      <section className="panel p-6">
        <h2 className="text-xl font-bold mb-4">Order Items</h2>
        <div className="space-y-2 text-sm">
          {order.items.map((item) => (
            <div key={item.name} className="flex justify-between pb-2 border-b border-black/10 last:border-b-0">
              <span className="text-[var(--ink-soft)]">
                {item.name} <span className="font-semibold">× {item.qty}</span>
              </span>
              <span className="font-semibold">GHS {item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
          <div className="pt-3 space-y-1 text-sm">
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
            <div className="flex justify-between font-bold text-base pt-2 border-t border-black/10">
              <span>Total</span>
              <span>GHS {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Address */}
      <section className="panel p-6">
        <h2 className="text-xl font-bold mb-4">Delivery Details</h2>
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-[var(--ink-soft)]">Name</p>
            <p className="font-semibold">{order.customerName}</p>
          </div>
          <div>
            <p className="text-[var(--ink-soft)]">Phone</p>
            <p className="font-semibold">{order.customerPhone}</p>
          </div>
          <div>
            <p className="text-[var(--ink-soft)]">Address</p>
            <p className="font-semibold">{order.customerAddress}</p>
          </div>
          {order.customerEmail && (
            <div>
              <p className="text-[var(--ink-soft)]">Email</p>
              <p className="font-semibold">{order.customerEmail}</p>
            </div>
          )}
          {order.customerNote && (
            <div>
              <p className="text-[var(--ink-soft)]">Delivery Notes</p>
              <p className="font-semibold">{order.customerNote}</p>
            </div>
          )}
        </div>
      </section>

      {/* Cancel Order */}
      {order.orderStatus !== "cancelled" && (
        <section className="panel p-6">
          <h2 className="text-xl font-bold mb-2">Cancel Order</h2>
          {canCancelOrder(order.orderStatus) ? (
            <>
              <p className="text-sm text-[var(--ink-soft)] mb-4">
                You can cancel this order while your payment is still under review. Once we confirm your payment, cancellation is no longer possible.
              </p>
              {cancelError && (
                <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{cancelError}</p>
              )}
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="rounded-full border-2 border-red-300 px-5 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                >
                  Cancel This Order
                </button>
              ) : (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-3">
                  <p className="font-semibold text-red-900">Are you sure you want to cancel order {orderRef}?</p>
                  <p className="text-sm text-red-700">This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => void handleCancel()}
                      disabled={cancelling}
                      className="rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancelling}
                      className="rounded-full border-2 border-gray-300 px-5 py-2 text-sm font-bold text-[var(--ink)] hover:bg-gray-50"
                    >
                      Keep Order
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700">
                This order can no longer be cancelled — it has progressed past the review stage.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Contact support below if you have an urgent issue.
              </p>
            </div>
          )}
        </section>
      )}

      {order.orderStatus === "cancelled" && (
        <section className="panel p-6 bg-red-50 border border-red-200">
          <h2 className="text-xl font-bold text-red-900 mb-2">Order Cancelled</h2>
          <p className="text-sm text-red-700">
            This order has been cancelled. If you paid a downpayment, please contact us for a refund.
          </p>
        </section>
      )}

      {/* User confirms they received the order */}
      {order.orderStatus === "in_transit" && (
        <section className="panel p-6 bg-emerald-50 border border-emerald-200">
          <h2 className="text-xl font-bold text-emerald-900 mb-2 flex items-center gap-2"><BoxIcon size={22} /> Did You Receive Your Order?</h2>
          <p className="text-sm text-emerald-800 mb-4">
            Once the driver hands over your package, tap the button below to confirm delivery. This helps us keep your order history up to date.
          </p>
          {confirmError && (
            <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{confirmError}</p>
          )}
          {!showConfirmDelivery ? (
            <button
              onClick={() => setShowConfirmDelivery(true)}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              ✅ I've Received My Order
            </button>
          ) : (
            <div className="rounded-lg bg-emerald-100 border border-emerald-300 p-4 space-y-3">
              <p className="font-semibold text-emerald-900">Confirm you received order {orderRef}?</p>
              <p className="text-sm text-emerald-700">Make sure you have received and checked all items before confirming.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => void handleConfirmDelivery()}
                  disabled={confirming}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {confirming ? "Confirming..." : "Yes, I Got It"}
                </button>
                <button
                  onClick={() => setShowConfirmDelivery(false)}
                  disabled={confirming}
                  className="rounded-full border-2 border-gray-300 px-5 py-2 text-sm font-bold text-[var(--ink)] hover:bg-gray-50"
                >
                  Not Yet
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {order.orderStatus === "delivered" && (
        <section className="panel p-6 bg-emerald-50 border border-emerald-200">
          <h2 className="text-xl font-bold text-emerald-900 mb-2 flex items-center gap-2"><BoxIcon size={22} /> Order Delivered!</h2>
          <p className="text-sm text-emerald-800">
            Your order has been delivered. Thank you for shopping with 101Hub! We hope you love your purchase.
          </p>
        </section>
      )}

      {/* Contact Support */}
      <section className="panel p-6 bg-blue-50 border border-blue-200">
        <h2 className="text-xl font-bold mb-3 text-blue-900">Need Help?</h2>
        <p className="text-sm text-blue-800 mb-3">
          Contact our support team for any questions about your order.
        </p>
        <div className="flex gap-3 flex-wrap">
          <a
            href="tel:+233548656980"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            📞 Call +233 548656980
          </a>
          <a
            href="mailto:josephsakyi247@gmail.com"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            ✉️ Email Support
          </a>
        </div>
      </section>
    </div>
  );
}
