"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { CreditCardIcon, GiftIcon, TruckIcon } from "@/components/Icons";
import { useStoreContent } from "@/lib/use-store-content";
import AnimatedPaymentModal from "@/components/AnimatedPaymentModal";
import PaymentDetailsCard from "@/components/PaymentDetailsCard";
import { saveOrderToLocal } from "@/lib/order-status";

type CartLine = { productId: string; qty: number };

type ActiveReward = {
  id: number;
  tierName: string;
  discountPercent: number;
  freeShipping: boolean;
};

type DealsReward = {
  id: number;
  discountCedis: number;
  label: string;
};

const STORAGE_KEY = "101hub-cart";
const REWARD_APPLIED_KEY = "101hub-reward-applied";
const DEALS_REWARD_APPLIED_KEY = "101hub-deals-reward-applied";
const MANUAL_PAYMENT_NUMBER = "+233 548656980";

const GHANA_REGIONS: Record<string, string[]> = {
  "Greater Accra": ["Accra Central", "East Legon", "Cantonments", "Osu", "Labone", "Airport Residential", "Madina", "Adenta", "Achimota", "Dome", "Dansoman", "Kaneshie", "Lapaz", "Darkuman", "Tema", "Tema New Town", "Ashaiman", "Nungua", "Teshie", "Labadi", "Kasoa", "Weija", "Spintex", "Sakumono", "Lashibi", "Tsaddo", "Batsonaa", "Kpone", "Prampram"],
  "Ashanti": ["Kumasi", "Obuasi", "Ejisu", "Konongo", "Mampong", "Bekwai", "Offinso", "Suame", "Tafo", "Asokwa", "Adum", "Bantama", "Krofrom", "Atonsu", "Ahinsan", "Abrepo", "Kwadaso", "Nhyiaeso", "Oforikrom"],
  "Western": ["Takoradi", "Sekondi", "Tarkwa", "Axim", "Prestea", "Bogoso", "Essikado", "Agona Nkwanta", "Half Assini", "Elubo"],
  "Central": ["Cape Coast", "Winneba", "Kasoa", "Mankessim", "Saltpond", "Dunkwa-on-Offin", "Assin Fosu", "Swedru", "Agona Swedru", "Elmina", "Anomabu"],
  "Eastern": ["Koforidua", "Nkawkaw", "Nsawam", "Akim Oda", "Suhum", "Akosombo", "Asamankese", "Kade", "Mpraeso", "Abetifi", "Begoro", "Kibi", "Donkorkrom"],
  "Volta": ["Ho", "Keta", "Kpando", "Hohoe", "Aflao", "Akatsi", "Sogakope", "Anloga", "Denu", "Dzodze"],
  "Northern": ["Tamale", "Yendi", "Damongo", "Bimbilla", "Salaga", "Savelugu", "Walewale", "Zabzugu", "Tolon", "Kumbungu"],
  "Upper East": ["Bolgatanga", "Navrongo", "Bawku", "Paga", "Zebilla", "Sandema", "Tongo", "Pusiga"],
  "Upper West": ["Wa", "Tumu", "Lawra", "Jirapa", "Nandom", "Nadowli", "Lambussie", "Gwollu"],
  "Bono": ["Sunyani", "Berekum", "Dormaa Ahenkro", "Wenchi", "Techiman", "Nkoranza", "Atebubu", "Kintampo"],
  "Bono East": ["Techiman", "Atebubu", "Kintampo", "Nkoranza", "Kwame Danso", "Yeji", "Prang"],
  "Ahafo": ["Goaso", "Bechem", "Duayaw Nkwanta", "Kukuom", "Kenyasi", "Hwidiem", "Acherensua"],
  "Savannah": ["Damongo", "Bole", "Salaga", "Sawla", "Buipe", "Tolon"],
  "North East": ["Nalerigu", "Gambaga", "Walewale", "Chereponi", "Bunkpurugu", "Yunyoo"],
  "Western North": ["Sefwi Wiawso", "Bibiani", "Enchi", "Juaboso", "Sefwi Bekwai", "Akontombra", "Bodi", "Dadieso"],
  "Oti": ["Dambai", "Nkwanta", "Kadjebi", "Jasikan", "Krachi", "Kete Krachi"],
};

type OrderLine = { name: string; qty: number; unitPrice: number; lineTotal: number };

type PaymentMethod = "manual";

type CheckoutResult = {
  success: boolean;
  orderRef: string;
  paymentMethod: string;
  message: string;
  customer: { name: string; phone: string; address: string; note: string; deliveryType?: string };
  lines: OrderLine[];
  totals: { subtotal: number; delivery: number; processingFee: number; total: number };
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
  const [region, setRegion] = useState("");
  const [town, setTown] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<CartLine[]>(() => loadLines());
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const paymentMethod: PaymentMethod = "manual";
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [invalidProducts, setInvalidProducts] = useState<CartLine[]>([]);
  const [activeReward, setActiveReward] = useState<ActiveReward | null>(null);
  const [rewardApplied, setRewardApplied] = useState(false);
  const [dealsReward, setDealsReward] = useState<DealsReward | null>(null);
  const [dealsRewardApplied, setDealsRewardApplied] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"mtn" | "telecel" | "at" | "bank" | null>(null);
  const products = useMemo(() => content?.products ?? [], [content?.products]);

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

  // Fetch active reward and check if applied from cart
  useEffect(() => {
    fetch("/api/referral/active-reward")
      .then((r) => r.json())
      .then((d) => {
        if (d.hasReward) {
          setActiveReward(d.reward);
          try {
            const applied = localStorage.getItem(REWARD_APPLIED_KEY);
            if (applied) setRewardApplied(true);
          } catch {}
        }
      })
      .catch(() => {});

    fetch("/api/deals/active-reward")
      .then((r) => r.json())
      .then((d) => {
        if (d.hasReward) {
          setDealsReward(d.reward);
          try {
            const applied = localStorage.getItem(DEALS_REWARD_APPLIED_KEY);
            if (applied) setDealsRewardApplied(true);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const deliverySettings = content?.deliverySettings;
    const totalQty = items.reduce((sum, line) => sum + line.qty, 0);
    const subtotal = items.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId);
      return sum + (product ? product.price * line.qty : 0);
    }, 0);

    let delivery = 0;
    if (subtotal > 0 && deliverySettings) {
      // Free delivery if item count meets threshold
      if (totalQty >= deliverySettings.freeDeliveryItemThreshold) {
        delivery = 0;
      } else {
        // Check if all items in cart are free delivery
        const allFree = items.every((line) => {
          const product = products.find((p) => p.id === line.productId);
          return product?.noDeliveryFee === true;
        });

        if (allFree) {
          delivery = 0;
        } else if ((deliverySettings.deliveryTypes ?? []).length > 0 && deliveryType) {
          // Use selected delivery type fee
          const dt = deliverySettings.deliveryTypes.find((t) => t.id === deliveryType);
          delivery = dt ? dt.fee : 0;
        } else if (deliverySettings.locationFees.some((l) => l.region) && region) {
          // Region-based location fee: match by town name first, then region
          const regionFees = deliverySettings.locationFees.filter(
            (l) => l.region === region || l.name === town
          );
          const bestMatch = regionFees.find((l) => l.name === town) ?? regionFees[0];
          delivery = bestMatch ? bestMatch.fee : deliverySettings.defaultFee;
        } else if (location) {
          // Use location-based fee
          const locFee = deliverySettings.locationFees.find((l) => l.id === location);
          delivery = locFee ? locFee.fee : deliverySettings.defaultFee;
        } else {
          // Use highest per-product fee or default
          const productFees = items.map((line) => {
            const product = products.find((p) => p.id === line.productId);
            if (product?.noDeliveryFee) return 0;
            return product?.deliveryFee ?? deliverySettings.defaultFee;
          });
          delivery = Math.max(...productFees, 0);
        }
      }
    }

    const processingFee = subtotal > 0 ? (deliverySettings?.processingFee ?? 4) : 0;
    const rewardDiscount = rewardApplied && activeReward ? subtotal * activeReward.discountPercent / 100 : 0;
    const dealsDiscount = dealsRewardApplied && dealsReward ? dealsReward.discountCedis : 0;
    const effectiveDelivery = rewardApplied && activeReward?.freeShipping ? 0 : delivery;
    const total = Math.max(0, subtotal - rewardDiscount - dealsDiscount + effectiveDelivery + processingFee);

    return { subtotal, delivery, processingFee, total, rewardDiscount, dealsDiscount, effectiveDelivery };
  }, [items, products, location, region, town, deliveryType, content?.deliverySettings, rewardApplied, activeReward, dealsRewardApplied, dealsReward]);

  // Payment amount is the full total
  const paymentAmount = totals.total;

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
    setError("");
    setPaymentProofError("");

    try {
      // Validate payment proof for manual method
      if (paymentMethod === "manual" && !paymentProof) {
        setPaymentProofError("Payment proof is required for manual payment.");
        setSubmitting(false);
        return;
      }

      // Show animation only after validation passes
      setShowPaymentAnimation(true);

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

      const fullAddress = [address, town, region].filter(Boolean).join(", ");

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          email,
          phone,
          address: fullAddress,
          location,
          deliveryType,
          note,
          items,
          paymentMethod,
          paymentProof: paymentProofBase64,
          applyReward: rewardApplied && activeReward ? true : false,
          applyDealsReward: dealsRewardApplied && dealsReward ? true : false,
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

      // Simulate processing delay
      setTimeout(() => {
          setShowPaymentAnimation(false);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(REWARD_APPLIED_KEY);
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
            processingFee: data.totals.processingFee,
            deliveryType: data.customer.deliveryType,
            total: data.totals.total,
            paymentMethod: "manual",
            paymentStatus: "pending",
            orderStatus: "payment_pending_admin_review",
            createdAt: new Date().toISOString(),
          });
          setResult(data);
          setItems([]);
        }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(errorMsg);
      setShowPaymentAnimation(false);
    } finally {
      setSubmitting(false);
    }
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
            {result.totals.processingFee > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--ink-soft)]">Processing fee</span>
                <span className="font-semibold">GHS {result.totals.processingFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black border-t border-black/10 pt-2 mt-2">
              <span>Total</span>
              <span>GHS {result.totals.total.toFixed(2)}</span>
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
          {result.customer.deliveryType && (
            <p><span className="text-[var(--ink-soft)]">Delivery type:</span> {result.customer.deliveryType}</p>
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
        amount={totals.total}
        paymentMethod={paymentMethod}
        onClose={() => setShowPaymentAnimation(false)}
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
      <form onSubmit={handleSubmit} className="form-styled space-y-5 p-5 sm:p-6 lg:order-1">
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
        {/* Personal Info Section */}
        <div className="form-section">
          <div className="form-section-header">Personal Information</div>
          <div className="space-y-4">
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
                className="input-styled"
              />
            </div>

            {/* Email (required) */}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-styled"
              />
              <p className="mt-1 text-xs text-[var(--ink-soft)]">We'll send your order confirmation to this email</p>
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
                className="input-styled"
              />
            </div>
          </div>
        </div>

        {/* Delivery Details Section */}
        <div className="form-section">
          <div className="form-section-header">Delivery Details</div>
          <div className="space-y-4">
            {/* Region */}
            <div>
              <label htmlFor="region" className="mb-1 block text-sm font-semibold">
                Region <span className="text-red-500">*</span>
              </label>
              <select
                id="region"
                required
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value);
                  setTown("");
                }}
                className="input-styled"
              >
                <option value="">— Select your region —</option>
                {Object.keys(GHANA_REGIONS).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Town */}
            {region && (
              <div>
                <label htmlFor="town" className="mb-1 block text-sm font-semibold">
                  Town / City <span className="text-red-500">*</span>
                </label>
                <select
                  id="town"
                  required
                  value={town}
                  onChange={(event) => setTown(event.target.value)}
                  className="input-styled"
                >
                  <option value="">— Select your town —</option>
                  {GHANA_REGIONS[region].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Delivery Address */}
            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-semibold">
                Street / Area Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                required
                placeholder="Street name, house number, landmark..."
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="input-styled h-24"
              />
            </div>

        {/* Delivery Location */}
        {content.deliverySettings.locationFees.length > 0 && (content.deliverySettings.deliveryTypes ?? []).length === 0 && (
          <div>
            {/* If location fees have region data, auto-match from region+town; else show dropdown */}
            {content.deliverySettings.locationFees.some((l) => l.region) ? (() => {
              // Auto-resolved from selected region + town
              const regionFees = content.deliverySettings.locationFees.filter(
                (l) => l.region === region || l.name === town
              );
              const bestMatch = regionFees.find((l) => l.name === town) ?? regionFees[0];
              if (region && bestMatch) {
                return (
                  <div className="rounded-lg bg-[var(--brand)]/5 border border-[var(--brand)]/20 px-3 py-2 flex items-center gap-2 text-sm">
                    <TruckIcon size={14} className="text-[var(--brand)] shrink-0" />
                    <span className="text-[var(--ink-soft)]">Delivery fee for <strong>{town || region}</strong>:</span>
                    <span className="font-black text-[var(--brand)]">GHS {bestMatch.fee.toFixed(2)}</span>
                  </div>
                );
              }
              if (region && regionFees.length === 0) {
                return (
                  <p className="text-xs text-[var(--ink-soft)] flex items-center gap-1">
                    <TruckIcon size={13} /> Default delivery fee applies: <span className="font-semibold">GHS {content.deliverySettings.defaultFee.toFixed(2)}</span>
                  </p>
                );
              }
              return null;
            })() : (
              <>
                <label htmlFor="location" className="mb-1 block text-sm font-semibold">
                  Delivery Location <span className="text-red-500">*</span>
                </label>
                <select
                  id="location"
                  required
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="input-styled"
                >
                  <option value="">— Select your area —</option>
                  {content.deliverySettings.locationFees.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} — GHS {loc.fee.toFixed(2)}
                    </option>
                  ))}
                </select>
                {location && (
                  <p className="mt-1 text-xs text-[var(--ink-soft)] flex items-center gap-1">
                    <TruckIcon size={13} /> Delivery fee for this area: <span className="font-semibold">GHS {(content.deliverySettings.locationFees.find((l) => l.id === location)?.fee ?? 0).toFixed(2)}</span>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Delivery Type */}
        {(content.deliverySettings.deliveryTypes ?? []).length > 0 && (
          <div>
            <label htmlFor="delivery-type" className="mb-1 block text-sm font-semibold">
              Delivery Method <span className="text-red-500">*</span>
            </label>
            <select
              id="delivery-type"
              required
              value={deliveryType}
              onChange={(event) => setDeliveryType(event.target.value)}
              className="input-styled"
            >
              <option value="">— Choose delivery method —</option>
              {content.deliverySettings.deliveryTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}{dt.fee > 0 ? ` — GHS ${dt.fee.toFixed(2)}` : " — Free"}
                </option>
              ))}
            </select>
            {deliveryType && (() => {
              const selected = content.deliverySettings.deliveryTypes.find((t) => t.id === deliveryType);
              return selected ? (
                <p className="mt-1 text-xs text-[var(--ink-soft)] flex items-center gap-1">
                  <TruckIcon size={13} /> {selected.description || selected.name}
                  {selected.fee > 0 ? ` — GHS ${selected.fee.toFixed(2)}` : " — Free"}
                </p>
              ) : null;
            })()}
          </div>
        )}

        {/* Free delivery encouragement */}
        {(() => {
          const totalQty = items.reduce((sum, line) => sum + line.qty, 0);
          const threshold = content.deliverySettings.freeDeliveryItemThreshold;
          const remaining = threshold - totalQty;
          if (remaining <= 0) return null;
          return (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
              <GiftIcon size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Add {remaining} more item{remaining !== 1 ? "s" : ""} for FREE delivery!</p>
                <p className="text-xs text-emerald-700 mt-0.5">Orders with {threshold}+ items ship for free — no matter your location.</p>
              </div>
            </div>
          );
        })()}

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
            className="input-styled h-20"
          />
        </div>
          </div>
        </div>

        {/* Payment Method Specific Fields */}
        {paymentMethod === "manual" && (
          <div className="space-y-4 border-t border-black/10 pt-4">
            {/* Main Payment Amount */}
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <p className="text-sm font-semibold text-amber-900 mb-1">💳 Payment Amount</p>
              <p className="text-2xl font-black text-amber-900 mb-2">GHS {totals.total.toFixed(2)}</p>
              <p className="text-xs text-amber-700">Full payment required</p>
            </div>

            {/* Provider Selection + Copyable Payment Details Card */}
            {(() => {
              const providerDefs = [
                {
                  id: "mtn" as const,
                  name: "MTN MoMo",
                  emoji: "🟡",
                  defaults: [
                    { label: "MoMo Number", value: MANUAL_PAYMENT_NUMBER, icon: "📱" },
                    { label: "Account Name", value: "101 Hub Technologies", icon: "👤" },
                    { label: "Network", value: "MTN Mobile Money", icon: "🏦" },
                  ],
                },
                {
                  id: "telecel" as const,
                  name: "Telecel",
                  emoji: "🔴",
                  defaults: [
                    { label: "Telecel Number", value: MANUAL_PAYMENT_NUMBER, icon: "📱" },
                    { label: "Account Name", value: "101 Hub Technologies", icon: "👤" },
                    { label: "Network", value: "Telecel Cash", icon: "🏦" },
                  ],
                },
                {
                  id: "at" as const,
                  name: "AT Money",
                  emoji: "🔵",
                  defaults: [
                    { label: "AT Number", value: MANUAL_PAYMENT_NUMBER, icon: "📱" },
                    { label: "Account Name", value: "101 Hub Technologies", icon: "👤" },
                    { label: "Network", value: "AT Money (AirtelTigo)", icon: "🏦" },
                  ],
                },
                {
                  id: "bank" as const,
                  name: "Bank",
                  emoji: "🏛️",
                  defaults: [
                    { label: "Account Name", value: "101 Hub Technologies", icon: "👤" },
                  ],
                },
              ];

              const currentProviderId = selectedProvider ?? "mtn";
              const currentDef = providerDefs.find((p) => p.id === currentProviderId)!;
              const savedFields = content.providerPaymentDetails?.[currentProviderId];
              const fields = savedFields && savedFields.some((f) => f.value)
                ? savedFields.filter((f) => f.value)
                : currentDef.defaults.filter((f) => f.value);

              return (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[var(--ink)]">Select Payment Provider</p>
                  <div className="flex flex-wrap gap-2">
                    {providerDefs.map((p) => {
                      const isSelected = currentProviderId === p.id;
                      const logo = content.providerLogos?.[p.id];
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedProvider(p.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                            isSelected
                              ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand-deep)]"
                              : "border-black/15 bg-white text-[var(--ink)] hover:border-[var(--brand)]/50"
                          }`}
                        >
                          {logo ? (
                            <img src={logo} alt={p.name} className="w-5 h-5 object-contain rounded" />
                          ) : (
                            <span>{p.emoji}</span>
                          )}
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                  <PaymentDetailsCard title="Payment Account Details" fields={fields} />
                </div>
              );
            })()}

            {/* Step-by-step Walkthrough */}
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-3">📋 Payment Steps</p>
              <div className="space-y-4">
                {content?.paymentWalkthrough && content.paymentWalkthrough.length > 0 ? (
                  // Display admin-configured walkthrough
                  content.paymentWalkthrough
                    .sort((a, b) => a.stepNumber - b.stepNumber)
                    .map((step) => (
                      <div key={step.id} className="rounded-lg bg-white border border-blue-200 overflow-hidden">
                        <div className="flex gap-3 p-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                            {step.stepNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-blue-900">{step.title}</p>
                            <p className="text-xs text-blue-800 mt-1">{step.description}</p>
                            {step.bulletPoints && step.bulletPoints.length > 0 && (
                              <ul className="text-xs text-blue-800 mt-2 ml-2 list-disc list-inside">
                                {step.bulletPoints.map((bullet, idx) => (
                                  <li key={idx}>{bullet}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                        {step.image && (
                          <div className="border-t border-blue-200 bg-blue-50 p-3">
                            <img
                              src={step.image}
                              alt={step.title}
                              className="w-full max-h-48 object-cover rounded border border-blue-200"
                            />
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  // Fallback to hardcoded steps if no admin configuration
                  <>
                    {/* Step 1 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Open Your Mobile Money / Bank App</p>
                        <p className="text-xs text-blue-800">MTN Mobile Money, Vodafone Cash, or your bank app</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Send Transfer</p>
                        <div className="mt-1 p-2 bg-white rounded border border-blue-200">
                          <p className="text-xs text-blue-900 font-mono font-bold">{MANUAL_PAYMENT_NUMBER}</p>
                          <p className="text-xs text-blue-800 mt-1">Amount: GHS {totals.total.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Save the Confirmation Screen</p>
                        <p className="text-xs text-blue-800">After payment, your app will show a confirmation message with a reference or receipt number. This is what we need to verify your payment.</p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Take a Screenshot</p>
                        <p className="text-xs text-blue-800">Take a clear screenshot showing:</p>
                        <ul className="text-xs text-blue-800 mt-1 ml-2 list-disc list-inside">
                          <li>Recipient phone number ({MANUAL_PAYMENT_NUMBER})</li>
                          <li>Amount (GHS {totals.total.toFixed(2)})</li>
                          <li>Transaction status or reference number</li>
                          <li>Date/time of transaction</li>
                        </ul>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">5</div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Upload Screenshot Below</p>
                        <p className="text-xs text-blue-800">Upload the screenshot using the file upload field below</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Proof Upload - With Clear Requirements */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <label htmlFor="payment-proof" className="mb-2 block">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">📸</span>
                  <span className="text-sm font-bold text-red-900">Screenshot Upload Required <span className="text-red-600">*</span></span>
                </div>
                <p className="text-xs text-red-800">This is mandatory to verify your payment</p>
              </label>
              
              <div className="mb-3 p-3 bg-white rounded border border-red-200">
                <p className="text-xs font-semibold text-red-900 mb-2">✓ What We Need:</p>
                <ul className="text-xs text-red-800 space-y-1 ml-4 list-disc">
                  <li>Screenshot of transfer confirmation screen</li>
                  <li>Must show amount: <span className="font-bold">GHS {totals.total.toFixed(2)}</span></li>
                  <li>Must show recipient: <span className="font-bold">{MANUAL_PAYMENT_NUMBER}</span></li>
                  <li>Transaction reference or status visible</li>
                  <li>Date & time visible</li>
                </ul>
              </div>

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
                className="w-full text-sm border border-red-300 rounded px-2 py-2 bg-white"
              />
              {paymentProof && (
                <p className="text-xs text-green-600 mt-2 font-semibold">✓ Screenshot selected: {paymentProof.name}</p>
              )}
              {paymentProofError && (
                <p className="text-xs text-red-600 mt-2">{paymentProofError}</p>
              )}
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
              <p className="text-xs text-gray-700">
                <span className="font-semibold">💡 Tip:</span> Include your order reference in the transfer memo if possible. This helps us verify your payment even faster.
              </p>
            </div>
          </div>
        )}

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn-styled rounded-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Placing order..." : "Place Order"}
        </button>

        <p className="text-xs text-center text-[var(--ink-soft)]">
          Questions? Call us:{" "}
          <a href="tel:+233548656980" className="font-semibold hover:underline">
            +233 548656980
          </a>
        </p>
      </form>

      {/* Order summary sidebar */}
      <aside className="panel p-4 sm:p-6 lg:order-2">
        <h2 className="text-xl font-black">Order Summary</h2>

        {/* Referral reward toggle */}
        {activeReward && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">✨</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-900 truncate">
                    {activeReward.tierName} Reward
                  </p>
                  <p className="text-xs text-emerald-700">
                    {activeReward.discountPercent}% off
                    {activeReward.freeShipping ? " + Free Shipping" : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRewardApplied((prev) => {
                    const next = !prev;
                    if (next) {
                      localStorage.setItem(REWARD_APPLIED_KEY, "true");
                    } else {
                      localStorage.removeItem(REWARD_APPLIED_KEY);
                    }
                    return next;
                  });
                }}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  rewardApplied
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {rewardApplied ? "Remove" : "Apply"}
              </button>
            </div>
          </div>
        )}

        {/* Deals reward toggle */}
        {dealsReward && (
          <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">🎁</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-violet-900 truncate">
                    {dealsReward.label}
                  </p>
                  <p className="text-xs text-violet-700">
                    GHS {dealsReward.discountCedis.toFixed(2)} off
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDealsRewardApplied((prev) => {
                    const next = !prev;
                    if (next) {
                      localStorage.setItem(DEALS_REWARD_APPLIED_KEY, "true");
                    } else {
                      localStorage.removeItem(DEALS_REWARD_APPLIED_KEY);
                    }
                    return next;
                  });
                }}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  dealsRewardApplied
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                {dealsRewardApplied ? "Remove" : "Apply"}
              </button>
            </div>
          </div>
        )}

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
            {rewardApplied && activeReward && totals.rewardDiscount > 0 && (
              <div className="mt-1 flex items-center justify-between text-emerald-700">
                <span className="flex items-center gap-1 text-xs">
                  ✨ {activeReward.tierName} ({activeReward.discountPercent}% off)
                </span>
                <span className="font-semibold">−GHS {totals.rewardDiscount.toFixed(2)}</span>
              </div>
            )}
            {dealsRewardApplied && dealsReward && totals.dealsDiscount > 0 && (
              <div className="mt-1 flex items-center justify-between text-violet-700">
                <span className="flex items-center gap-1 text-xs">
                  🎁 {dealsReward.label}
                </span>
                <span className="font-semibold">−GHS {totals.dealsDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[var(--ink-soft)]">Delivery</span>
              <span className="font-semibold">
                {rewardApplied && activeReward?.freeShipping
                  ? "Free ✨"
                  : totals.effectiveDelivery === 0
                  ? "Free"
                  : `GHS ${totals.effectiveDelivery.toFixed(2)}`}
              </span>
            </div>
            {totals.subtotal > 0 && totals.processingFee > 0 && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[var(--ink-soft)]">Processing fee</span>
                <span className="font-semibold">GHS {totals.processingFee.toFixed(2)}</span>
              </div>
            )}
            {totals.subtotal > 0 && totals.delivery > 0 && (
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Add {Math.max(0, (content?.deliverySettings.freeDeliveryItemThreshold ?? 5) - items.reduce((s, l) => s + l.qty, 0))} more item(s) for free delivery <GiftIcon size={13} className="inline-block align-middle" />
              </p>
            )}
            <div className="mt-2 flex items-center justify-between text-base">
              <span className="font-bold">Total</span>
              <span className="font-black">GHS {totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </aside>
      </div>
    </>
  );
}
