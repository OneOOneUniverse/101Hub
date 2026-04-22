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

type PaymentProvider = {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  accentClasses: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  fields: Array<{ label: string; value: string; icon: string }>;
};

const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: "mtn",
    name: "MTN Mobile Money",
    shortName: "MTN MoMo",
    emoji: "🟡",
    accentClasses: "border-yellow-300 hover:border-yellow-400 hover:bg-yellow-50",
    activeBg: "bg-yellow-50",
    activeBorder: "border-yellow-400",
    activeText: "text-yellow-800",
    fields: [
      { label: "MoMo Number", value: MANUAL_PAYMENT_NUMBER, icon: "📱" },
      { label: "Account Name", value: "101 Hub Technologies", icon: "👤" },
      { label: "Network", value: "MTN Mobile Money", icon: "🏦" },
    ],
  },
  {
    id: "telecel",
    name: "Telecel Cash",
    shortName: "Telecel",
    emoji: "🔴",
    accentClasses: "border-red-300 hover:border-red-400 hover:bg-red-50",
    activeBg: "bg-red-50",
    activeBorder: "border-red-400",
    activeText: "text-red-800",
    fields: [
      { label: "Telecel Number", value: MANUAL_PAYMENT_NUMBER, icon: "📱" },
      { label: "Account Name", value: "101 Hub Technologies", icon: "👤" },
      { label: "Network", value: "Telecel Cash", icon: "🏦" },
    ],
  },
  {
    id: "at",
    name: "AT Money",
    shortName: "AT",
    emoji: "🔵",
    accentClasses: "border-blue-300 hover:border-blue-400 hover:bg-blue-50",
    activeBg: "bg-blue-50",
    activeBorder: "border-blue-400",
    activeText: "text-blue-800",
    fields: [
      { label: "AT Number", value: MANUAL_PAYMENT_NUMBER, icon: "📱" },
      { label: "Account Name", value: "101 Hub Technologies", icon: "👤" },
      { label: "Network", value: "AT Money (AirtelTigo)", icon: "🏦" },
    ],
  },
  {
    id: "bank",
    name: "Bank Transfer",
    shortName: "Bank",
    emoji: "🏛️",
    accentClasses: "border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50",
    activeBg: "bg-indigo-50",
    activeBorder: "border-indigo-400",
    activeText: "text-indigo-800",
    fields: [
      { label: "Account Number", value: "1020543896", icon: "🔢" },
      { label: "Account Name", value: "101 Hub Technologies", icon: "👤" },
      { label: "Bank", value: "GCB Bank", icon: "🏦" },
      { label: "Branch", value: "Accra Main", icon: "📍" },
    ],
  },
];

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
  if (typeof window === "undefined") return [] as CartLine[];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [] as CartLine[];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as CartLine[];
  }
}

// ── Step label helper ───────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Personal Info", icon: "👤" },
  { id: 2, label: "Delivery", icon: "📦" },
  { id: 3, label: "Payment", icon: "💳" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step.id < current
                  ? "bg-[#0f172a] text-white"
                  : step.id === current
                  ? "border-2 border-[#0f172a] bg-white text-[#0f172a]"
                  : "border-2 border-[#e2e8f0] bg-white text-[#94a3b8]"
              }`}
            >
              {step.id < current ? (
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                  <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
                </svg>
              ) : (
                <span className="text-xs">{step.id}</span>
              )}
            </div>
            <span
              className={`text-xs font-semibold whitespace-nowrap ${
                step.id === current ? "text-[#0f172a]" : step.id < current ? "text-[#0f172a]" : "text-[#94a3b8]"
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mb-4 ${step.id < current ? "bg-[#0f172a]" : "bg-[#e2e8f0]"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-black/6 px-5 py-3.5">
        {accent && <div className={`h-4 w-1 rounded-full ${accent}`} />}
        <h3 className="text-sm font-black text-[var(--ink)]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
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
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [invalidProducts, setInvalidProducts] = useState<CartLine[]>([]);
  const [activeReward, setActiveReward] = useState<ActiveReward | null>(null);
  const [rewardApplied, setRewardApplied] = useState(false);
  const [dealsReward, setDealsReward] = useState<DealsReward | null>(null);
  const [dealsRewardApplied, setDealsRewardApplied] = useState(false);
  const products = useMemo(() => content?.products ?? [], [content?.products]);

  useEffect(() => {
    if (products.length === 0) return;
    const productIds = products.map((p) => p.id);
    const invalid = items.filter((line) => !productIds.includes(line.productId));
    if (invalid.length > 0) {
      setInvalidProducts(invalid);
      const validItems = items.filter((line) => productIds.includes(line.productId));
      setItems(validItems);
    }
  }, [products, items]);

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
      if (totalQty >= deliverySettings.freeDeliveryItemThreshold) {
        delivery = 0;
      } else {
        const allFree = items.every((line) => {
          const product = products.find((p) => p.id === line.productId);
          return product?.noDeliveryFee === true;
        });
        if (allFree) {
          delivery = 0;
        } else if ((deliverySettings.deliveryTypes ?? []).length > 0 && deliveryType) {
          const dt = deliverySettings.deliveryTypes.find((t) => t.id === deliveryType);
          delivery = dt ? dt.fee : 0;
        } else if (location) {
          const locFee = deliverySettings.locationFees.find((l) => l.id === location);
          delivery = locFee ? locFee.fee : deliverySettings.defaultFee;
        } else {
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
  }, [items, products, location, deliveryType, content?.deliverySettings, rewardApplied, activeReward, dealsRewardApplied, dealsReward]);

  const paymentAmount = totals.total;

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

  if (contentError || !content) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-black text-red-900">Checkout Error</h1>
        <p className="mt-2 text-sm text-red-700">{contentError || "Could not load checkout data."}</p>
      </div>
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
      if (paymentMethod === "manual" && !paymentProof) {
        setPaymentProofError("Payment proof is required for manual payment.");
        setSubmitting(false);
        return;
      }
      if (paymentMethod === "manual" && !selectedProvider) {
        setError("Please select a payment provider before placing your order.");
        setSubmitting(false);
        return;
      }

      setShowPaymentAnimation(true);

      let paymentProofBase64 = "";
      if (paymentMethod === "manual" && paymentProof) {
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
          customerName, email, phone,
          address: fullAddress,
          location, deliveryType, note, items,
          paymentMethod,
          paymentProvider: selectedProvider,
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

      setTimeout(() => {
        setShowPaymentAnimation(false);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(REWARD_APPLIED_KEY);
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

  // ── Order confirmation screen ────────────────────────────────────────────
  if (result) {
    return (
      <div className="space-y-5">
        {/* Success banner */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black">Order Confirmed!</h1>
              <p className="mt-0.5 text-sm text-white/70">
                Reference:{" "}
                <span className="font-mono font-bold text-white">{result.orderRef}</span>
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/90 leading-relaxed">
            {result.message}
          </p>
        </div>

        {/* Items */}
        <SectionCard title="Items Ordered" accent="bg-[var(--brand)]">
          <div className="space-y-2 text-sm">
            {result.lines.map((line) => (
              <div key={line.name} className="flex items-center justify-between py-1.5 border-b border-black/5 last:border-b-0">
                <span className="text-[var(--ink-soft)]">
                  {line.name} <span className="font-semibold text-[var(--ink)]">× {line.qty}</span>
                </span>
                <span className="font-semibold">GHS {line.lineTotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-black/8 space-y-1.5">
              <div className="flex justify-between text-[var(--ink-soft)]">
                <span>Subtotal</span>
                <span className="font-semibold text-[var(--ink)]">GHS {result.totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[var(--ink-soft)]">
                <span>Delivery</span>
                <span className="font-semibold text-[var(--ink)]">
                  {result.totals.delivery === 0 ? "Free" : `GHS ${result.totals.delivery.toFixed(2)}`}
                </span>
              </div>
              {result.totals.processingFee > 0 && (
                <div className="flex justify-between text-[var(--ink-soft)]">
                  <span>Processing fee</span>
                  <span className="font-semibold text-[var(--ink)]">GHS {result.totals.processingFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base border-t border-black/10 pt-2 mt-1">
                <span>Total</span>
                <span className="text-[var(--brand-deep)]">GHS {result.totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Delivery details */}
        <SectionCard title="Delivery Details" accent="bg-blue-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-[var(--ink-soft)] font-semibold uppercase tracking-wide mb-0.5">Name</p>
              <p className="font-semibold">{result.customer.name}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--ink-soft)] font-semibold uppercase tracking-wide mb-0.5">Phone</p>
              <p className="font-semibold">{result.customer.phone}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-[var(--ink-soft)] font-semibold uppercase tracking-wide mb-0.5">Address</p>
              <p className="font-semibold">{result.customer.address}</p>
            </div>
            {result.customer.note && (
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--ink-soft)] font-semibold uppercase tracking-wide mb-0.5">Notes</p>
                <p className="font-semibold">{result.customer.note}</p>
              </div>
            )}
            {result.customer.deliveryType && (
              <div>
                <p className="text-xs text-[var(--ink-soft)] font-semibold uppercase tracking-wide mb-0.5">Delivery type</p>
                <p className="font-semibold">{result.customer.deliveryType}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--ink-soft)] font-semibold uppercase tracking-wide mb-0.5">Payment</p>
              <p className="font-semibold">{result.paymentMethod}</p>
            </div>
          </div>
        </SectionCard>

        {/* Contact */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="font-bold text-blue-900 mb-2">Need help with your order?</p>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${result.storePhone.replace(/\s/g, "")}`}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
              📞 {result.storePhone}
            </a>
            <a href={`mailto:${result.storeEmail}`}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
              ✉️ {result.storeEmail}
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={`/orders/${result.orderRef}`}
            className="flex-1 rounded-full bg-[#0f172a] px-5 py-3 text-sm font-bold text-white text-center hover:bg-[#1e293b] transition-colors">
            📍 Track Order
          </a>
          <a href="/products"
            className="flex-1 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white text-center hover:bg-[var(--brand-deep)] transition-colors">
            Continue Shopping
          </a>
        </div>
      </div>
    );
  }

  // ── Empty cart ───────────────────────────────────────────────────────────
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-black/8 bg-white p-10 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-black text-[var(--ink)]">Your Cart is Empty</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Add products to your cart before checking out.</p>
        </div>
        <a href="/products"
          className="inline-block rounded-full bg-[var(--brand)] px-7 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] transition-colors">
          Browse Products
        </a>
      </div>
    );
  }

  // ── Checkout form ────────────────────────────────────────────────────────
  return (
    <>
      <AnimatedPaymentModal
        isOpen={showPaymentAnimation}
        amount={totals.total}
        paymentMethod={paymentMethod}
        onClose={() => setShowPaymentAnimation(false)}
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* ── Left: Form ─────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Page header */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-5 py-5 text-white shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black">Checkout</h1>
                <p className="text-xs text-white/50 mt-0.5">Complete your order in 3 steps</p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Secure Checkout
              </div>
            </div>
          </div>

          {/* Invalid products warning */}
          {invalidProducts.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-900 mb-1">⚠️ Cart Problem Detected</p>
              <p className="text-xs text-red-800">
                {invalidProducts.length} product(s) in your cart are no longer available and have been removed.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Stepper */}
            <StepIndicator current={!customerName || !email || !phone ? 1 : !address || !region || !town ? 2 : 3} />

            {/* ── Step 1: Personal Info ──────────────────────── */}
            <SectionCard title="Personal Information" accent="bg-[var(--brand)]">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Full Name <span className="text-red-500 normal-case tracking-normal">*</span>
                  </label>
                  <input
                    id="name" required
                    placeholder="e.g. Kwame Mensah"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--ink-soft)]/50 focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Email Address <span className="text-red-500 normal-case tracking-normal">*</span>
                  </label>
                  <input
                    id="email" type="email" required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--ink-soft)]/50 focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
                  />
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">Order confirmation will be sent here</p>
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Phone Number <span className="text-red-500 normal-case tracking-normal">*</span>
                  </label>
                  <input
                    id="phone" required
                    placeholder="+233 …"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--ink-soft)]/50 focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
                  />
                </div>
              </div>
            </SectionCard>

            {/* ── Step 2: Delivery ──────────────────────────── */}
            <SectionCard title="Delivery Details" accent="bg-blue-500">
              <div className="space-y-4">
                {/* Region */}
                <div>
                  <label htmlFor="region" className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Region <span className="text-red-500 normal-case tracking-normal">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="region" required
                      value={region}
                      onChange={(e) => { setRegion(e.target.value); setTown(""); }}
                      className="w-full appearance-none rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-2.5 pr-10 text-sm text-[var(--ink)] focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
                    >
                      <option value="">— Select your region —</option>
                      {Object.keys(GHANA_REGIONS).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="h-4 w-4 text-[var(--ink-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Town */}
                {region && (
                  <div>
                    <label htmlFor="town" className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Town / City <span className="text-red-500 normal-case tracking-normal">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="town" required
                        value={town}
                        onChange={(e) => setTown(e.target.value)}
                        className="w-full appearance-none rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-2.5 pr-10 text-sm text-[var(--ink)] focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
                      >
                        <option value="">— Select your town —</option>
                        {GHANA_REGIONS[region].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="h-4 w-4 text-[var(--ink-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div>
                  <label htmlFor="address" className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Street / Area Address <span className="text-red-500 normal-case tracking-normal">*</span>
                  </label>
                  <textarea
                    id="address" required
                    placeholder="Street name, house number, landmark…"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--ink-soft)]/50 resize-none h-20 focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
                  />
                </div>

                {/* Delivery Location */}
                {content.deliverySettings.locationFees.length > 0 && (content.deliverySettings.deliveryTypes ?? []).length === 0 && (
                  <div>
                    <label htmlFor="location" className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Delivery Location <span className="text-red-500 normal-case tracking-normal">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="location" required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full appearance-none rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-2.5 pr-10 text-sm text-[var(--ink)] focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
                      >
                        <option value="">— Select your area —</option>
                        {content.deliverySettings.locationFees.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} — GHS {loc.fee.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="h-4 w-4 text-[var(--ink-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {location && (
                      <p className="mt-1 text-xs text-[var(--ink-soft)] flex items-center gap-1">
                        <TruckIcon size={13} /> Delivery fee:{" "}
                        <span className="font-bold text-[var(--ink)]">
                          GHS {(content.deliverySettings.locationFees.find((l) => l.id === location)?.fee ?? 0).toFixed(2)}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Delivery Type */}
                {(content.deliverySettings.deliveryTypes ?? []).length > 0 && (
                  <div>
                    <label htmlFor="delivery-type" className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Delivery Method <span className="text-red-500 normal-case tracking-normal">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="delivery-type" required
                        value={deliveryType}
                        onChange={(e) => setDeliveryType(e.target.value)}
                        className="w-full appearance-none rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-2.5 pr-10 text-sm text-[var(--ink)] focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
                      >
                        <option value="">— Choose delivery method —</option>
                        {content.deliverySettings.deliveryTypes.map((dt) => (
                          <option key={dt.id} value={dt.id}>
                            {dt.name}{dt.fee > 0 ? ` — GHS ${dt.fee.toFixed(2)}` : " — Free"}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="h-4 w-4 text-[var(--ink-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
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

                {/* Free delivery nudge */}
                {(() => {
                  const totalQty = items.reduce((sum, line) => sum + line.qty, 0);
                  const threshold = content.deliverySettings.freeDeliveryItemThreshold;
                  const remaining = threshold - totalQty;
                  if (remaining <= 0) return null;
                  return (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <GiftIcon size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">
                          Add {remaining} more item{remaining !== 1 ? "s" : ""} for FREE delivery!
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Orders with {threshold}+ items ship for free.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Order note */}
                <div>
                  <label htmlFor="note" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Order Notes <span className="font-normal normal-case tracking-normal text-[var(--ink-soft)]">(optional)</span>
                  </label>
                  <textarea
                    id="note"
                    placeholder="Landmark, delivery instructions…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border-2 border-black/8 bg-gray-50/60 px-4 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--ink-soft)]/50 resize-none h-16 focus:outline-none focus:bg-white focus:border-[var(--brand)] transition-all"
                  />
                </div>
              </div>
            </SectionCard>

            {/* ── Step 3: Payment ───────────────────────────── */}
            <SectionCard title="Payment" accent="bg-amber-500">
              <div className="space-y-5">
                {/* Amount highlight */}
                <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Amount to Pay</p>
                    <p className="text-3xl font-black text-amber-900 leading-none mt-1">
                      GHS {totals.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">Full payment required</p>
                  </div>
                  <CreditCardIcon size={36} className="text-amber-400 opacity-60" />
                </div>

                {/* Provider selector */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Payment Provider <span className="text-red-500 normal-case tracking-normal">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PAYMENT_PROVIDERS.map((provider) => {
                      const isActive = selectedProvider === provider.id;
                      return (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => setSelectedProvider(provider.id)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                            isActive
                              ? `${provider.activeBg} ${provider.activeBorder} ${provider.activeText} shadow-sm ring-2 ring-offset-1 ring-current/30`
                              : `border-gray-200 bg-white text-[var(--ink-soft)] hover:border-gray-300 hover:bg-gray-50`
                          }`}
                        >
                          {content?.providerLogos?.[provider.id as keyof NonNullable<typeof content.providerLogos>] ? (
                            <img
                              src={content.providerLogos[provider.id as keyof NonNullable<typeof content.providerLogos>]!}
                              alt={provider.name}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <span className="text-2xl leading-none">{provider.emoji}</span>
                          )}
                          <span className="text-xs font-bold leading-tight">{provider.shortName}</span>
                          {isActive && (
                            <span className="text-[10px] font-bold opacity-70">Selected ✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!selectedProvider && (
                    <p className="mt-2 text-xs text-[var(--ink-soft)]">
                      Select a provider to see payment details.
                    </p>
                  )}
                </div>

                {/* Payment details */}
                {selectedProvider && (() => {
                  const provider = PAYMENT_PROVIDERS.find((p) => p.id === selectedProvider)!;
                  const adminFields = content?.providerPaymentDetails?.[selectedProvider as keyof typeof content.providerPaymentDetails]
                    ?? (selectedProvider === "mtn" && content?.manualPaymentDetails && content.manualPaymentDetails.length > 0
                      ? content.manualPaymentDetails.filter((f) => f.value)
                      : null);
                  const fields = adminFields && adminFields.length > 0 ? adminFields.filter((f) => f.value) : provider.fields.filter((f) => f.value);
                  return (
                    <div className="space-y-3">
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${provider.activeBg} ${provider.activeText}`}>
                        {content?.providerLogos?.[provider.id as keyof NonNullable<typeof content.providerLogos>] ? (
                          <img src={content.providerLogos[provider.id as keyof NonNullable<typeof content.providerLogos>]!} alt={provider.name} className="w-5 h-5 object-contain shrink-0" />
                        ) : (
                          <span className="text-base">{provider.emoji}</span>
                        )}
                        Send <span className="font-black">GHS {totals.total.toFixed(2)}</span> via {provider.name}
                      </div>
                      <PaymentDetailsCard title="Account Details" fields={fields} />
                    </div>
                  );
                })()}

                {/* Payment steps */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black">i</span>
                    Payment Steps
                  </p>
                  <div className="space-y-4">
                    {content?.paymentWalkthrough && content.paymentWalkthrough.length > 0 ? (
                      content.paymentWalkthrough
                        .sort((a, b) => a.stepNumber - b.stepNumber)
                        .map((step) => (
                          <div key={step.id} className="rounded-xl bg-white border border-blue-200 overflow-hidden">
                            <div className="flex gap-3 p-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-black">
                                {step.stepNumber}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-blue-900">{step.title}</p>
                                <p className="text-xs text-blue-800 mt-0.5">{step.description}</p>
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
                                <img src={step.image} alt={step.title} className="w-full max-h-48 object-cover rounded border border-blue-200" />
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      [
                        { n: 1, title: `Open Your ${selectedProvider ? PAYMENT_PROVIDERS.find((p) => p.id === selectedProvider)?.name : "Mobile Money / Bank"} App`, desc: "Open the app for your selected payment provider" },
                        { n: 2, title: "Send Transfer", desc: `Transfer GHS ${totals.total.toFixed(2)} to ${selectedProvider ? PAYMENT_PROVIDERS.find((p) => p.id === selectedProvider)?.fields[0].value || MANUAL_PAYMENT_NUMBER : MANUAL_PAYMENT_NUMBER}` },
                        { n: 3, title: "Save Confirmation Screen", desc: "Screenshot the confirmation showing reference number, amount, and date." },
                        { n: 4, title: "Upload Screenshot Below", desc: "Upload it using the file upload field below." },
                      ].map((step) => (
                        <div key={step.n} className="flex gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">{step.n}</div>
                          <div>
                            <p className="text-sm font-bold text-blue-900">{step.title}</p>
                            <p className="text-xs text-blue-800">{step.desc}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Screenshot upload — highlighted as required */}
                <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white text-xs font-black">!</div>
                    <div>
                      <p className="text-sm font-black text-red-900">Screenshot Upload Required</p>
                      <p className="text-xs text-red-700">This is mandatory to verify your payment</p>
                    </div>
                  </div>

                  <div className="mb-3 rounded-lg border border-red-200 bg-white p-3">
                    <p className="text-xs font-bold text-red-900 mb-1.5">✓ Your screenshot must show:</p>
                    <ul className="text-xs text-red-800 space-y-1 ml-3 list-disc">
                      <li>Amount: <span className="font-black">GHS {totals.total.toFixed(2)}</span></li>
                      <li>Recipient: <span className="font-bold">
                        {selectedProvider
                          ? PAYMENT_PROVIDERS.find((p) => p.id === selectedProvider)?.fields[0].value || MANUAL_PAYMENT_NUMBER
                          : MANUAL_PAYMENT_NUMBER}
                      </span></li>
                      <li>Transaction reference or status</li>
                      <li>Date &amp; time of transfer</li>
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
                    className="w-full text-sm border-2 border-red-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-red-500"
                  />
                  {paymentProof && (
                    <p className="text-xs text-emerald-700 mt-2 font-bold flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {paymentProof.name}
                    </p>
                  )}
                  {paymentProofError && (
                    <p className="text-xs text-red-600 mt-2 font-semibold">{paymentProofError}</p>
                  )}
                </div>

                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-700">
                  <span className="font-bold">💡 Tip:</span> Include your order reference in the transfer memo if possible. This helps us verify your payment faster.
                </div>
              </div>
            </SectionCard>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <svg className="mt-0.5 h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                <p className="text-sm font-semibold text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-gradient-to-r from-[#0f172a] to-[#1e293b] py-3.5 text-sm font-black text-white shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Placing order…
                </span>
              ) : (
                "Place Order →"
              )}
            </button>

            <p className="text-xs text-center text-[var(--ink-soft)]">
              Questions?{" "}
              <a href="tel:+233548656980" className="font-bold text-[var(--ink)] hover:underline">
                Call +233 548656980
              </a>
            </p>
          </form>
        </div>

        {/* ── Right: Order Summary ───────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <SectionCard title="Order Summary" accent="bg-emerald-500">
            <div className="space-y-1">
              {/* Referral reward */}
              {activeReward && (
                <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">✨</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-emerald-900 truncate">{activeReward.tierName} Reward</p>
                        <p className="text-xs text-emerald-700">
                          {activeReward.discountPercent}% off{activeReward.freeShipping ? " + Free Shipping" : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRewardApplied((prev) => {
                          const next = !prev;
                          if (next) localStorage.setItem(REWARD_APPLIED_KEY, "true");
                          else localStorage.removeItem(REWARD_APPLIED_KEY);
                          return next;
                        });
                      }}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        rewardApplied ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {rewardApplied ? "Remove" : "Apply"}
                    </button>
                  </div>
                </div>
              )}

              {/* Deals reward */}
              {dealsReward && (
                <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">🎁</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-violet-900 truncate">{dealsReward.label}</p>
                        <p className="text-xs text-violet-700">GHS {dealsReward.discountCedis.toFixed(2)} off</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDealsRewardApplied((prev) => {
                          const next = !prev;
                          if (next) localStorage.setItem(DEALS_REWARD_APPLIED_KEY, "true");
                          else localStorage.removeItem(DEALS_REWARD_APPLIED_KEY);
                          return next;
                        });
                      }}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        dealsRewardApplied ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-violet-600 text-white hover:bg-violet-700"
                      }`}
                    >
                      {dealsRewardApplied ? "Remove" : "Apply"}
                    </button>
                  </div>
                </div>
              )}

              {/* Items */}
              {items.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                if (!product) return null;
                return (
                  <div key={line.productId} className="flex items-center justify-between py-1.5 border-b border-black/5 last:border-b-0 text-sm">
                    <span className="text-[var(--ink-soft)] min-w-0 truncate pr-2">
                      {product.name}{" "}
                      <span className="font-semibold text-[var(--ink)]">× {line.qty}</span>
                    </span>
                    <span className="font-semibold shrink-0">GHS {(product.price * line.qty).toFixed(2)}</span>
                  </div>
                );
              })}

              {/* Totals */}
              <div className="pt-3 mt-1 border-t border-black/8 space-y-2 text-sm">
                <div className="flex justify-between text-[var(--ink-soft)]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[var(--ink)]">GHS {totals.subtotal.toFixed(2)}</span>
                </div>
                {rewardApplied && activeReward && totals.rewardDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 text-xs">
                    <span>✨ {activeReward.tierName} ({activeReward.discountPercent}% off)</span>
                    <span className="font-bold">−GHS {totals.rewardDiscount.toFixed(2)}</span>
                  </div>
                )}
                {dealsRewardApplied && dealsReward && totals.dealsDiscount > 0 && (
                  <div className="flex justify-between text-violet-700 text-xs">
                    <span>🎁 {dealsReward.label}</span>
                    <span className="font-bold">−GHS {totals.dealsDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[var(--ink-soft)]">
                  <span>Delivery</span>
                  <span className="font-semibold text-[var(--ink)]">
                    {rewardApplied && activeReward?.freeShipping
                      ? "Free ✨"
                      : totals.effectiveDelivery === 0
                      ? "Free"
                      : `GHS ${totals.effectiveDelivery.toFixed(2)}`}
                  </span>
                </div>
                {totals.subtotal > 0 && totals.processingFee > 0 && (
                  <div className="flex justify-between text-[var(--ink-soft)]">
                    <span>Processing fee</span>
                    <span className="font-semibold text-[var(--ink)]">GHS {totals.processingFee.toFixed(2)}</span>
                  </div>
                )}
                {totals.subtotal > 0 && totals.delivery > 0 && (
                  <p className="text-xs text-[var(--ink-soft)]">
                    Add {Math.max(0, (content?.deliverySettings.freeDeliveryItemThreshold ?? 5) - items.reduce((s, l) => s + l.qty, 0))} more item(s) for free delivery <GiftIcon size={12} className="inline-block align-middle" />
                  </p>
                )}
                <div className="flex justify-between text-base font-black border-t border-black/10 pt-2 mt-1">
                  <span>Total</span>
                  <span className="text-[var(--brand-deep)]">GHS {totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Security badge */}
          <div className="rounded-2xl border border-black/8 bg-white p-4 text-center space-y-1 shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--ink-soft)]">
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="font-semibold">Secure &amp; Encrypted</span>
            </div>
            <p className="text-xs text-[var(--ink-soft)]">Your order &amp; payment info is safe with us</p>
          </div>
        </aside>
      </div>
    </>
  );
}
