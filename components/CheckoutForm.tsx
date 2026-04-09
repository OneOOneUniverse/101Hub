"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { useStoreContent } from "@/lib/use-store-content";
import PaystackButton from "@/components/PaystackButton";
import AnimatedPaymentModal from "@/components/AnimatedPaymentModal";
import { saveOrderToLocal } from "@/lib/order-status";

type CartLine = { productId: string; qty: number };

const STORAGE_KEY = "101hub-cart";
const MANUAL_PAYMENT_NUMBER = "+233 548656980";

type OrderLine = { name: string; qty: number; unitPrice: number; lineTotal: number };

type PaymentMethod = "paystack" | "manual";

type CheckoutResult = {
  success: boolean;
  orderRef: string;
  paymentMethod: string;
  message: string;
  customer: { name: string; phone: string; address: string; note: string };
  lines: OrderLine[];
  totals: { subtotal: number; delivery: number; total: number; downpayment: number };
  storePhone: string;
  storeEmail: string;
};

function loadLines() {
  if (typeof window === "undefined") {
    return [] as CartLine[];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [] as CartLine[];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as CartLine[];
  }
}

export default function CheckoutForm() {
  const { content, loading, error: contentError } = useStoreContent();
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<CartLine[]>(() => loadLines());
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paystack");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [showPaystack, setShowPaystack] = useState(false);
  const [paystackOrderRef, setPaystackOrderRef] = useState("");
  const [invalidProducts, setInvalidProducts] = useState<CartLine[]>([]);
  const products = useMemo(() => content?.products ?? [], [content?.products]);
  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
  const isPaystackConfigured = Boolean(paystackPublicKey) && !paystackPublicKey.startsWith("pk_test_xxx");

  // Default to manual if Paystack not configured
  useEffect(() => {
    if (!isPaystackConfigured) {
      setPaymentMethod("manual");
    }
  }, [isPaystackConfigured]);

  // Validate cart items on mount and when products change
  useEffect(() => {
    if (products.length === 0) return;
    
    const productIds = products.map((p) => p.id);
    const invalid = items.filter((line) => !productIds.includes(line.productId));
    
    if (invalid.length > 0) {
      setInvalidProducts(invalid);
      // Auto-remove invalid items from checkout
      const validItems = items.filter((line) => productIds.includes(line.productId));
      setItems(validItems);
    }
  }, [products, items]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId);
      return sum + (product ? product.price * line.qty : 0);
    }, 0);

    const delivery = subtotal > 250 ? 0 : subtotal > 0 ? 12 : 0;
    const total = subtotal + delivery;
    const downpayment = total * 0.4; // 40% downpayment

    return {
      subtotal,
      delivery,
      total,
      downpayment,
    };
  }, [items, products]);

  if (loading) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Checkout</h1>
        <p className="mt-2 text-[var(--ink-soft)]">Loading checkout...</p>
      </section>
    );
  }

  if (contentError || !content) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Checkout</h1>
        <p className="mt-2 text-red-600">{contentError || "Could not load checkout data."}</p>
      </section>
    );
  }

  if (!content.features.cart || !content.features.checkout) {
    return (
      <FeatureUnavailable
        title="Checkout Unavailable"
        description="The checkout flow is currently turned off from the admin panel."
        actionHref="/products"
        actionLabel="Browse Products"
      />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setShowPaymentAnimation(true);
    setError("");
    setPaymentProofError("");

    try {
      // Validate payment proof for manual method
      if (paymentMethod === "manual" && !paymentProof) {
        setPaymentProofError("Payment proof is required for manual payment.");
        setSubmitting(false);
        return;
      }

      let paymentProofBase64 = "";
      if (paymentMethod === "manual" && paymentProof) {
        // Convert file to base64
        paymentProofBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(paymentProof);
        });
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          email,
          phone,
          address,
          note,
          items,
          paymentMethod,
          paymentProof: paymentProofBase64,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      let data: CheckoutResult & { error?: string };
      if (contentType.includes("application/json")) {
        data = (await response.json()) as CheckoutResult & { error?: string };
      } else {
        setError("Server returned non-JSON response.");
        setSubmitting(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || "Unable to place order.");
        setSubmitting(false);
        setShowPaymentAnimation(false);
        return;
      }

      // For Paystack, show payment widget; for manual, show confirmation
      if (paymentMethod === "paystack") {
        setPaystackOrderRef(data.orderRef);
        setShowPaystack(true);
        setShowPaymentAnimation(false);
      } else {
        // Simulate processing delay
        setTimeout(() => {
          setShowPaymentAnimation(false);
          localStorage.removeItem(STORAGE_KEY);
          // Emit event so cart badge updates
          window.dispatchEvent(new Event("101hub:cart-updated"));
          saveOrderToLocal({
            orderRef: data.orderRef,
            customerName: data.customer.name,
            customerPhone: data.customer.phone,
            customerAddress: data.customer.address,
            customerEmail: email,
            customerNote: data.customer.note,
            items: data.lines,
            subtotal: data.totals.subtotal,
            delivery: data.totals.delivery,
            total: data.totals.total,
            downpayment: data.totals.downpayment,
            paymentMethod: "manual",
            paymentStatus: "pending",
            orderStatus: "payment_pending_admin_review",
            createdAt: new Date().toISOString(),
          });
          setResult(data);
          setItems([]);
        }, 2000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(errorMsg);
      setShowPaymentAnimation(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaystackSuccess(reference: string) {
    setShowPaystack(false);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("101hub:cart-updated"));

    // Verify the payment server-side
    try {
      await fetch("/api/checkout/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
    } catch {
      // Non-fatal — order was already recorded
    }

    const subtotal = items.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId);
      return sum + (product ? product.price * line.qty : 0);
    }, 0);
    const delivery = subtotal > 250 ? 0 : 12;
    const total = subtotal + delivery;
    const downpayment = total * 0.4;

    setResult({
      success: true,
      orderRef: paystackOrderRef,
      paymentMethod: "Paystack (Online)",
      message: "✅ Payment confirmed! Your order is being processed.",
      customer: { name: customerName, phone, address, note },
      lines: items.map((line) => {
        const product = products.find((item) => item.id === line.productId);
        return {
          name: product?.name ?? line.productId,
          qty: line.qty,
          unitPrice: product?.price ?? 0,
          lineTotal: (product?.price ?? 0) * line.qty,
        };
      }),
      totals: { subtotal, delivery, total, downpayment },
      storePhone: process.env.NEXT_PUBLIC_STORE_PHONE ?? "+233 548656980",
      storeEmail: process.env.NEXT_PUBLIC_STORE_EMAIL ?? "",
    });
    saveOrderToLocal({
      orderRef: paystackOrderRef,
      customerName,
      customerPhone: phone,
      customerAddress: address,
      customerEmail: email,
      customerNote: note,
      items: items.map((line) => {
        const product = products.find((item) => item.id === line.productId);
        return {
          name: product?.name ?? line.productId,
          qty: line.qty,
          unitPrice: product?.price ?? 0,
          lineTotal: (product?.price ?? 0) * line.qty,
        };
      }),
      subtotal,
      delivery,
      total,
      downpayment,
      paymentMethod: "paystack",
      paymentStatus: "verified",
      orderStatus: "confirmed",
      createdAt: new Date().toISOString(),
    });
    setItems([]);
  }

  function handlePaystackClose() {
    setShowPaystack(false);
    setError("Payment was cancelled. You can try again or switch to manual transfer.");
  }

  // ── Order confirmation screen ───────────────────────────────────────────────
  if (result) {
    return (
      <section className="panel space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-xl">
            ✓
          </span>
          <div>
            <h1 className="text-2xl font-black">Order Confirmed!</h1>
            <p className="text-sm text-[var(--ink-soft)]">
              Reference: <span className="font-mono font-semibold text-[var(--brand)]">{result.orderRef}</span>
            </p>
          </div>
        </div>

        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{result.message}</p>

        {/* Items ordered */}
        <div>
          <h2 className="mb-3 text-base font-bold">Items Ordered</h2>
          <div className="space-y-2">
            {result.lines.map((line) => (
              <div key={line.name} className="flex items-center justify-between text-sm">
                <span className="text-[var(--ink-soft)]">
                  {line.name} <span className="font-semibold text-[var(--ink)]">× {line.qty}</span>
                </span>
                <span className="font-semibold">GHS {line.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-3 border-t border-black/10 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--ink-soft)]">Subtotal</span>
              <span className="font-semibold">GHS {result.totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ink-soft)]">Delivery</span>
              <span className="font-semibold">
                {result.totals.delivery === 0 ? "Free" : `GHS ${result.totals.delivery.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-black border-t border-black/10 pt-2 mt-2">
              <span>Total</span>
              <span>GHS {result.totals.total.toFixed(2)}</span>
            </div>

            {/* Downpayment info */}
            <div className="mt-3 rounded-lg bg-amber-50 p-3 border border-amber-200">
              <div className="flex justify-between mb-1">
                <span className="text-[var(--ink-soft)] font-semibold">Downpayment (40%)</span>
                <span className="font-bold text-amber-900">GHS {result.totals.downpayment.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--ink-soft)]">Remaining on delivery (60%)</span>
                <span className="font-semibold text-[var(--ink)]">GHS {(result.totals.total - result.totals.downpayment).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="rounded-lg border border-black/10 p-4 text-sm space-y-1">
          <p className="font-bold mb-2">Delivery Details</p>
          <p><span className="text-[var(--ink-soft)]">Name:</span> {result.customer.name}</p>
          <p><span className="text-[var(--ink-soft)]">Phone:</span> {result.customer.phone}</p>
          <p><span className="text-[var(--ink-soft)]">Address:</span> {result.customer.address}</p>
          {result.customer.note && (
            <p><span className="text-[var(--ink-soft)]">Note:</span> {result.customer.note}</p>
          )}
          <p className="mt-2">
            <span className="text-[var(--ink-soft)]">Payment:</span>{" "}
            <span className="font-semibold">{result.paymentMethod}</span>
          </p>
        </div>

        {/* Store contact */}
        <div className="rounded-lg bg-[var(--brand)]/5 px-4 py-3 text-sm space-y-1">
          <p className="font-bold text-[var(--brand)]">Need help?</p>
          <p>
            📞{" "}
            <a href={`tel:${result.storePhone.replace(/\s/g, "")}`} className="font-semibold hover:underline">
              {result.storePhone}
            </a>
          </p>
          <p>
            ✉️{" "}
            <a href={`mailto:${result.storeEmail}`} className="font-semibold hover:underline">
              {result.storeEmail}
            </a>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={`/orders/${result.orderRef}`}
            className="flex-1 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 text-center"
          >
            📍 Track Order
          </a>
          <a
            href="/products"
            className="flex-1 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] text-center"
          >
            Continue Shopping
          </a>
        </div>
      </section>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (!items.length) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-black">Checkout</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Your cart is empty. Add products before checkout.
        </p>
      </section>
    );
  }

  // ── Checkout form ───────────────────────────────────────────────────────────
  return (
    <>
      <AnimatedPaymentModal
        isOpen={showPaymentAnimation}
        amount={totals.downpayment}
        paymentMethod={paymentMethod}
        onClose={() => setShowPaymentAnimation(false)}
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <form onSubmit={handleSubmit} className="panel space-y-4 p-6">
        <h1 className="text-2xl font-black">Checkout</h1>

        {/* Invalid products warning */}
        {invalidProducts.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-2">
            <p className="text-sm font-semibold text-red-900">
              ⚠️ Cart Problem Detected
            </p>
            <p className="text-xs text-red-800">
              {invalidProducts.length} product(s) in your cart are no longer available and have been removed.
            </p>
            <div className="text-xs text-red-700 space-y-1">
              {invalidProducts.map((item) => (
                <div key={item.productId}>
                  • {item.productId} (qty: {item.qty})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-900">
            💳 Payment Method
          </p>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 ${isPaystackConfigured ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
              <input
                type="radio"
                name="payment-method"
                value="paystack"
                checked={paymentMethod === "paystack"}
                disabled={!isPaystackConfigured}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">
                Paystack (Card / Mobile Money / Bank Transfer)
                {!isPaystackConfigured && (
                  <span className="ml-2 text-xs text-amber-700">[Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to enable]</span>
                )}
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="payment-method"
                value="manual"
                checked={paymentMethod === "manual"}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">
                Manual Transfer (Upload Payment Proof)
              </span>
            </label>
          </div>
        </div>

        {/* Downpayment Amount Display */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs text-amber-900 mb-2">Downpayment Required</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-900">GHS {totals.downpayment.toFixed(2)}</span>
            <span className="text-sm text-amber-800">(40% of total)</span>
          </div>
          <p className="text-xs text-amber-700 mt-2">Remaining GHS {(totals.total - totals.downpayment).toFixed(2)} (60%) payable at delivery</p>
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-semibold">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            required
            placeholder="e.g. Kwame Mensah"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>

        {/* Email (optional) */}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            Email Address{" "}
            <span className="text-[var(--ink-soft)] font-normal">(optional — for order confirmation)</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-semibold">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            required
            placeholder="+233 ..."
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>

        {/* Delivery Address */}
        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-semibold">
            Delivery Address <span className="text-red-500">*</span>
          </label>
          <textarea
            id="address"
            required
            placeholder="Street, area, city..."
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="h-24 w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>

        {/* Order note */}
        <div>
          <label htmlFor="note" className="mb-1 block text-sm font-semibold">
            Order Notes{" "}
            <span className="text-[var(--ink-soft)] font-normal">(optional)</span>
          </label>
          <textarea
            id="note"
            placeholder="Landmark, delivery instructions..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="h-20 w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>

        {/* Payment Method Specific Fields */}
        {paymentMethod === "manual" && (
          <div className="space-y-3 border-t border-black/10 pt-4">
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <p className="text-sm font-semibold text-amber-900 mb-2">📱 Manual Payment Instructions</p>
              <p className="text-sm text-amber-800 mb-1">Pay GHS <span className="font-bold">{totals.downpayment.toFixed(2)}</span> to:</p>
              <p className="text-lg font-black text-amber-900 font-mono mb-3">{MANUAL_PAYMENT_NUMBER}</p>
              <p className="text-xs text-amber-700">Include your order reference in the transfer/memo to help us verify your payment faster.</p>
            </div>

            {/* Payment Proof Upload */}
            <div>
              <label htmlFor="payment-proof" className="mb-1 block text-sm font-semibold">
                Upload Payment Proof <span className="text-red-500">*</span>
                <span className="text-[var(--ink-soft)] font-normal text-xs block">Screenshot of transfer receipt or confirmation</span>
              </label>
              <input
                id="payment-proof"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      setPaymentProofError("Image must be smaller than 5MB");
                      setPaymentProof(null);
                    } else {
                      setPaymentProof(file);
                      setPaymentProofError("");
                    }
                  }
                }}
                className="w-full text-sm"
              />
              {paymentProof && (
                <p className="text-xs text-green-600 mt-1">✓ {paymentProof.name}</p>
              )}
              {paymentProofError && (
                <p className="text-xs text-red-600 mt-1">{paymentProofError}</p>
              )}
            </div>
          </div>
        )}

        {paymentMethod === "paystack" && (
          <div className="rounded-lg bg-green-50 p-4 border border-green-200">
            <p className="text-sm text-green-900">
              💳 You will complete payment of <span className="font-bold">GHS {totals.downpayment.toFixed(2)}</span> securely via Paystack (Card, MTN/Vodafone Mobile Money, or bank transfer).
            </p>
          </div>
        )}

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        {showPaystack && (
          <div className="space-y-3 border-t border-black/10 pt-4">
            <p className="text-sm font-semibold text-[var(--ink)]">Complete Your Payment</p>
            <PaystackButton
              amount={totals.downpayment}
              orderRef={paystackOrderRef}
              customerEmail={email || "guest@101hub.com"}
              customerName={customerName}
              customerPhone={phone}
              onSuccess={handlePaystackSuccess}
              onClose={handlePaystackClose}
            />
            <button
              type="button"
              onClick={() => setShowPaystack(false)}
              className="w-full rounded-full bg-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-400"
            >
              ← Back
            </button>
          </div>
        )}

        {!showPaystack && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Placing order..." : "Place Order"}
          </button>
        )}

        <p className="text-xs text-center text-[var(--ink-soft)]">
          Questions? Call us:{" "}
          <a href="tel:+233548656980" className="font-semibold hover:underline">
            +233 548656980
          </a>
        </p>
      </form>

      {/* Order summary sidebar */}
      <aside className="panel p-6">
        <h2 className="text-xl font-black">Order Summary</h2>
        <div className="mt-4 space-y-2 text-sm">
          {items.map((line) => {
            const product = products.find((item) => item.id === line.productId);
            if (!product) return null;

            return (
              <div key={line.productId} className="flex items-center justify-between">
                <span className="text-[var(--ink-soft)]">
                  {product.name} × {line.qty}
                </span>
                <span className="font-semibold">GHS {(product.price * line.qty).toFixed(2)}</span>
              </div>
            );
          })}
          <div className="mt-3 border-t border-black/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[var(--ink-soft)]">Subtotal</span>
              <span className="font-semibold">GHS {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[var(--ink-soft)]">Delivery</span>
              <span className="font-semibold">
                {totals.delivery === 0 ? "Free" : `GHS ${totals.delivery.toFixed(2)}`}
              </span>
            </div>
            {totals.subtotal > 0 && totals.delivery > 0 && (
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Free delivery on orders over GHS 250
              </p>
            )}
            <div className="mt-2 flex items-center justify-between text-base">
              <span className="font-bold">Total</span>
              <span className="font-black">GHS {totals.total.toFixed(2)}</span>
            </div>

            {/* Downpayment Breakdown */}
            <div className="mt-3 rounded-lg bg-amber-50 p-3 border border-amber-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--ink-soft)] text-xs font-semibold">Downpayment (40%)</span>
                <span className="font-bold text-amber-900">GHS {totals.downpayment.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--ink-soft)] text-xs">On Delivery (60%)</span>
                <span className="font-semibold text-sm">GHS {(totals.total - totals.downpayment).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
      </div>
    </>
  );
}
