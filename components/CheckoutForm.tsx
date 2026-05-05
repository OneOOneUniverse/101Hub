"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { CreditCardIcon, GiftIcon, TruckIcon } from "@/components/Icons";
import { useStoreContent } from "@/lib/use-store-content";
import AnimatedPaymentModal from "@/components/AnimatedPaymentModal";
import PaymentDetailsCard from "@/components/PaymentDetailsCard";
import { saveOrderToLocal } from "@/lib/order-status";
import {
  sanitizeLine,
  sanitizeText,
  isValidEmail,
  isValidGhanaPhone,
  isValidName,
  isValidImageFile,
  hasMinLength,
  hasMaxLength,
} from "@/lib/validation";

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
const CHECKOUT_AUTOSAVE_KEY = "101hub-checkout-draft";
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
  const { user, isLoaded: userLoaded } = useUser();
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  // True once Clerk confirms user is signed in and email is locked
  const emailLocked = userLoaded && Boolean(user?.primaryEmailAddress?.emailAddress);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState("");
  const [town, setTown] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [note, setNote] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
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
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
  const [paymentWaitingReturned, setPaymentWaitingReturned] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  // Discount code
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<{ code: string; type: "percent" | "fixed"; value: number; discountAmount: number; description: string } | null>(null);
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  // Per-field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  // ── Restore draft on mount ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_AUTOSAVE_KEY);
      if (!saved) return;
      const d = JSON.parse(saved) as Record<string, string>;
      if (d.customerName) setCustomerName(d.customerName);
      if (d.email) setEmail(d.email);
      if (d.phone) setPhone(d.phone);
      if (d.address) setAddress(d.address);
      if (d.region) setRegion(d.region);
      if (d.town) setTown(d.town);
      if (d.location) setLocation(d.location);
      if (d.deliveryType) setDeliveryType(d.deliveryType);
      if (d.note) setNote(d.note);
      if (d.selectedProvider) setSelectedProvider(d.selectedProvider as "mtn" | "telecel" | "at" | "bank");
      // If user was in the middle of paying, restore that state too
      if (d.wasWaiting === "true") {
        setIsWaitingForPayment(true);
        setPaymentWaitingReturned(true); // came back to page = already returned
      }
      setDraftRestored(true);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Autofill from signed-in Clerk user (always overrides draft email) ───────
  useEffect(() => {
    if (!userLoaded || !user) return;
    const clerkEmail = user.primaryEmailAddress?.emailAddress ?? "";
    const clerkName = user.username ?? [user.firstName, user.lastName].filter(Boolean).join(" ") ?? "";
    const clerkPhone = (user.primaryPhoneNumber?.phoneNumber ?? "").replace(/\D/g, "");
    if (clerkEmail) setEmail(clerkEmail);
    if (clerkName) setCustomerName((prev) => prev || clerkName);
    if (clerkPhone) setPhone((prev) => prev || clerkPhone);
  }, [userLoaded, user]);

  // ── Autosave form fields on every change ───────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(
        CHECKOUT_AUTOSAVE_KEY,
        JSON.stringify({
          customerName,
          email,
          phone,
          address,
          region,
          town,
          location,
          deliveryType,
          note,
          selectedProvider,
          wasWaiting: isWaitingForPayment ? "true" : "false",
        })
      );
    } catch {}
  }, [customerName, email, phone, address, region, town, location, deliveryType, note, selectedProvider, isWaitingForPayment]);

  // ── Detect when user switches back from banking app ────────────────────────
  useEffect(() => {
    if (!isWaitingForPayment) return;
    const handleVisibility = () => {
      if (!document.hidden) {
        setPaymentWaitingReturned(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isWaitingForPayment]);

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
    const codeDiscount = appliedCode ? appliedCode.discountAmount : 0;
    const effectiveDelivery = rewardApplied && activeReward?.freeShipping ? 0 : delivery;
    const total = Math.max(0, subtotal - rewardDiscount - dealsDiscount - codeDiscount + effectiveDelivery + processingFee);

    return { subtotal, delivery, processingFee, total, rewardDiscount, dealsDiscount, codeDiscount, effectiveDelivery };
  }, [items, products, location, region, town, deliveryType, content?.deliverySettings, rewardApplied, activeReward, dealsRewardApplied, dealsReward, appliedCode]);

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

  async function handleApplyCode() {
    const code = discountCodeInput.trim().toUpperCase();
    if (!code) return;
    setCodeLoading(true);
    setCodeError("");
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: totals.subtotal }),
      });
      const data = await res.json() as { valid?: boolean; code?: string; type?: "percent" | "fixed"; value?: number; discountAmount?: number; description?: string; error?: string };
      if (!res.ok || !data.valid) {
        setCodeError(data.error ?? "Invalid discount code");
        setAppliedCode(null);
      } else {
        setAppliedCode({ code: data.code!, type: data.type!, value: data.value!, discountAmount: data.discountAmount!, description: data.description! });
        setCodeError("");
      }
    } catch {
      setCodeError("Could not verify code — try again");
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPaymentProofError("");

    // ── Field-level validation ───────────────────────────────────────────────
    const errors: Record<string, string> = {};

    const safeName = sanitizeLine(customerName);
    if (!safeName) {
      errors.customerName = "Full name is required.";
    } else if (!isValidName(safeName)) {
      errors.customerName = "Name can only contain letters, spaces, hyphens, or apostrophes (2–80 characters).";
    }

    const safeEmail = sanitizeLine(email);
    if (!safeEmail) {
      errors.email = "Email address is required.";
    } else if (!isValidEmail(safeEmail)) {
      errors.email = "Please enter a valid email address (e.g. you@example.com).";
    }

    const safePhone = sanitizeLine(phone);
    if (!safePhone) {
      errors.phone = "Phone number is required.";
    } else if (!isValidGhanaPhone(safePhone)) {
      errors.phone = "Enter a valid Ghana phone number (e.g. 0241234567 or +233241234567).";
    }

    const safeAddress = sanitizeText(address);
    if (!safeAddress) {
      errors.address = "Delivery address is required.";
    } else if (!hasMinLength(safeAddress, 5)) {
      errors.address = "Please provide a more detailed address (at least 5 characters).";
    } else if (!hasMaxLength(safeAddress, 300)) {
      errors.address = "Address is too long (max 300 characters).";
    }

    const safeNote = sanitizeText(note);
    if (safeNote && !hasMaxLength(safeNote, 500)) {
      errors.note = "Note is too long (max 500 characters).";
    }

    if (paymentMethod === "manual" && !paymentProof) {
      setPaymentProofError("Payment proof (screenshot) is required.");
      errors.paymentProof = "required";
    } else if (paymentMethod === "manual" && paymentProof) {
      const fileCheck = isValidImageFile(paymentProof);
      if (!fileCheck.ok) {
        setPaymentProofError(fileCheck.message);
        errors.paymentProof = "invalid";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);

    try {
      // Validate GPS coords when selected delivery type requires location
      const selectedDeliveryType = content?.deliverySettings?.deliveryTypes?.find((t) => t.id === deliveryType);
      if (selectedDeliveryType?.requiresLocation && !gpsCoords) {
        setError("Please share your location before placing the order — it is required for this delivery method.");
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

      const fullAddress = [safeAddress, town, region].filter(Boolean).join(", ");

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: safeName,
          email: safeEmail,
          phone: safePhone,
          address: fullAddress,
          location,
          deliveryType,
          gpsCoords: gpsCoords ?? undefined,
          note: safeNote,
          items,
          paymentMethod,
          paymentProof: paymentProofBase64,
          applyReward: rewardApplied && activeReward ? true : false,
          applyDealsReward: dealsRewardApplied && dealsReward ? true : false,
          discountCode: appliedCode ? appliedCode.code : undefined,
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
          localStorage.removeItem(CHECKOUT_AUTOSAVE_KEY);
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
                        <a href={`tel:${result.storePhone.replace(/\s/g, "")}`} className="font-semibold hover:underline">
              {result.storePhone}
            </a>
          </p>
          <p>
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
            Track Order
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

      {/* ── Waiting-for-payment overlay ─────────────────────────────────── */}
      {isWaitingForPayment && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          {!paymentWaitingReturned ? (
            /* ── Waiting state: user is in their banking app ── */
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl space-y-5">
              {/* Pulsing phone icon */}
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30 animate-ping" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                </span>
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Waiting for you…</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Switch to your <span className="font-semibold text-emerald-700">MoMo or banking app</span>, send{" "}
                  <span className="font-black text-gray-900">GHS {totals.total.toFixed(2)}</span>,
                  and take a screenshot of the confirmation.
                </p>
              </div>
              {/* Animated progress dots */}
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400">
                This page will update automatically when you return
              </p>
              {/* Amount reminder */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-xs text-emerald-700 font-semibold">Amount to send</p>
                <p className="text-2xl font-black text-emerald-800">GHS {totals.total.toFixed(2)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWaitingForPayment(false);
                  setPaymentWaitingReturned(false);
                }}
                className="text-xs text-gray-400 underline hover:text-gray-600"
              >
                Cancel — go back to form
              </button>
            </div>
          ) : (
            /* ── Returned state: user came back ── */
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl space-y-5">
              {/* Success animation */}
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </span>
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Welcome back!</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Great — now upload your payment screenshot below and submit your order.
                  <br />
                  <span className="text-xs text-gray-400 mt-1 block">
                    Your form details were saved while you were away.
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-left space-y-1">
                <p className="text-xs font-bold text-blue-900">Checklist before submitting:</p>
                <ul className="text-xs text-blue-800 space-y-1 ml-3 list-disc">
                  <li>Screenshot shows <span className="font-semibold">GHS {totals.total.toFixed(2)}</span></li>
                  <li>Recipient number is visible</li>
                  <li>Transaction status / reference visible</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setIsWaitingForPayment(false)}
                className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 transition-colors active:scale-95"
              >
                Upload Screenshot Now
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsWaitingForPayment(false);
                  setPaymentWaitingReturned(false);
                }}
                className="text-xs text-gray-400 underline hover:text-gray-600"
              >
                Not done yet — go back to form
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Draft-restored banner ───────────────────────────────────────── */}
      {draftRestored && !isWaitingForPayment && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800 font-semibold">
            Your form was restored from where you left off.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(CHECKOUT_AUTOSAVE_KEY);
              setDraftRestored(false);
              setCustomerName(""); setEmail(""); setPhone(""); setAddress("");
              setRegion(""); setTown(""); setLocation(""); setDeliveryType(""); setNote("");
              setSelectedProvider(null);
            }}
            className="shrink-0 text-xs text-amber-700 underline hover:text-amber-900"
          >
            Clear & start over
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
      <form onSubmit={handleSubmit} className="form-styled space-y-5 p-5 sm:p-6 lg:order-1">
        <h1 className="text-2xl font-black">Checkout</h1>

        {/* Invalid products warning */}
        {invalidProducts.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-2">
            <p className="text-sm font-semibold text-red-900">
              Cart Problem Detected
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
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  if (fieldErrors.customerName) setFieldErrors((p) => ({ ...p, customerName: "" }));
                }}
                className={`input-styled${fieldErrors.customerName ? " border-red-400" : ""}`}
              />
              {fieldErrors.customerName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.customerName}</p>
              )}
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
                readOnly={emailLocked}
                onChange={(event) => {
                  if (emailLocked) return;
                  setEmail(event.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
                }}
                className={`input-styled${fieldErrors.email ? " border-red-400" : ""}${emailLocked ? " cursor-not-allowed opacity-70 select-none" : ""}`}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
              ) : emailLocked ? (
                <p className="mt-1 text-xs text-[var(--ink-soft)]">Using your account email · <a href="/profile" className="text-[var(--brand)] hover:underline">change in profile</a></p>
              ) : (
                <p className="mt-1 text-xs text-[var(--ink-soft)]">We'll send your order confirmation to this email</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-semibold">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="+233 ..."
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: "" }));
                }}
                className={`input-styled${fieldErrors.phone ? " border-red-400" : ""}`}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              )}
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
                onChange={(event) => {
                  setAddress(event.target.value);
                  if (fieldErrors.address) setFieldErrors((p) => ({ ...p, address: "" }));
                }}
                className={`input-styled h-24${fieldErrors.address ? " border-red-400" : ""}`}
              />
              {fieldErrors.address && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>
              )}
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
              onChange={(event) => {
                const newType = event.target.value;
                setDeliveryType(newType);
                setGpsCoords(null);
                setGpsError("");
                // Trigger GPS request automatically if the selected type requires it
                const dt = content.deliverySettings.deliveryTypes.find((t) => t.id === newType);
                if (dt?.requiresLocation) {
                  setGpsLoading(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      setGpsLoading(false);
                    },
                    (err) => {
                      setGpsError(
                        err.code === 1
                          ? "Location access denied. Please allow location in your browser and try again."
                          : "Could not get your location. Please try again."
                      );
                      setGpsLoading(false);
                    },
                    { enableHighAccuracy: true, timeout: 15000 }
                  );
                }
              }}
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
                <>
                  <p className="mt-1 text-xs text-[var(--ink-soft)] flex items-center gap-1">
                    <TruckIcon size={13} /> {selected.description || selected.name}
                    {selected.fee > 0 ? ` — GHS ${selected.fee.toFixed(2)}` : " — Free"}
                  </p>
                  {/* GPS Location capture */}
                  {selected.requiresLocation && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-xs font-bold text-blue-800">Real-time location required for this delivery method</p>
                      </div>
                      {gpsLoading && (
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Detecting your location…
                        </div>
                      )}
                      {gpsCoords && !gpsLoading && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Location captured ({gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)})
                          <a
                            href={`https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 underline text-blue-600 hover:text-blue-800"
                          >
                            View on map
                          </a>
                        </div>
                      )}
                      {gpsError && !gpsLoading && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-red-600 font-semibold">{gpsError}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setGpsError("");
                              setGpsLoading(true);
                              navigator.geolocation.getCurrentPosition(
                                (pos) => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
                                (err) => { setGpsError(err.code === 1 ? "Location access denied. Please allow location in your browser." : "Could not get your location."); setGpsLoading(false); },
                                { enableHighAccuracy: true, timeout: 15000 }
                              );
                            }}
                            className="rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      )}
                      {!gpsCoords && !gpsLoading && !gpsError && (
                        <button
                          type="button"
                          onClick={() => {
                            setGpsLoading(true);
                            navigator.geolocation.getCurrentPosition(
                              (pos) => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
                              (err) => { setGpsError(err.code === 1 ? "Location access denied. Please allow location in your browser." : "Could not get your location."); setGpsLoading(false); },
                              { enableHighAccuracy: true, timeout: 15000 }
                            );
                          }}
                          className="flex items-center gap-1.5 rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Share My Location
                        </button>
                      )}
                    </div>
                  )}
                </>
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
            maxLength={500}
            onChange={(event) => {
              setNote(event.target.value);
              if (fieldErrors.note) setFieldErrors((p) => ({ ...p, note: "" }));
            }}
            className={`input-styled h-20${fieldErrors.note ? " border-red-400" : ""}`}
          />
          <p className="mt-0.5 text-right text-xs text-[var(--ink-soft)]">{note.length}/500</p>
          {fieldErrors.note && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.note}</p>
          )}
        </div>
          </div>
        </div>

        {/* Payment Method Specific Fields */}
        {paymentMethod === "manual" && (
          <div className="space-y-4 border-t border-black/10 pt-4">
            {/* Main Payment Amount */}
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <p className="text-sm font-semibold text-amber-900 mb-1">Payment Amount</p>
              <p className="text-2xl font-black text-amber-900 mb-2">GHS {totals.total.toFixed(2)}</p>
              <p className="text-xs text-amber-700">Full payment required</p>
            </div>

            {/* Provider Selection + Copyable Payment Details Card */}
            {(() => {
              const providerDefs = [
                {
                  id: "mtn" as const,
                  name: "MTN MoMo",
                  dotColor: "#f59e0b",
                  defaults: [
                    { label: "MoMo Number", value: MANUAL_PAYMENT_NUMBER, icon: "phone" },
                    { label: "Account Name", value: "101 Hub Technologies", icon: "user" },
                    { label: "Network", value: "MTN Mobile Money", icon: "bank" },
                  ],
                },
                {
                  id: "telecel" as const,
                  name: "Telecel",
                  dotColor: "#ef4444",
                  defaults: [
                    { label: "Telecel Number", value: MANUAL_PAYMENT_NUMBER, icon: "phone" },
                    { label: "Account Name", value: "101 Hub Technologies", icon: "user" },
                    { label: "Network", value: "Telecel Cash", icon: "bank" },
                  ],
                },
                {
                  id: "at" as const,
                  name: "AT Money",
                  dotColor: "#3b82f6",
                  defaults: [
                    { label: "AT Number", value: MANUAL_PAYMENT_NUMBER, icon: "phone" },
                    { label: "Account Name", value: "101 Hub Technologies", icon: "user" },
                    { label: "Network", value: "AT Money (AirtelTigo)", icon: "bank" },
                  ],
                },
                {
                  id: "bank" as const,
                  name: "Bank",
                  dotColor: "#6b7280",
                  defaults: [
                    { label: "Account Name", value: "101 Hub Technologies", icon: "user" },
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
                            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: p.dotColor }} />
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
              <p className="text-sm font-semibold text-blue-900 mb-3">Payment Steps</p>
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

            {/* Go Pay Now CTA */}
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-md">
              <p className="text-sm font-bold mb-1">Ready to pay?</p>
              <p className="text-xs text-emerald-100 mb-3">
                Open your banking / MoMo app, send{" "}
                <span className="font-black">GHS {totals.total.toFixed(2)}</span>, take a screenshot, then come back here to upload it.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsWaitingForPayment(true);
                  setPaymentWaitingReturned(false);
                }}
                className="w-full rounded-full bg-white text-emerald-700 font-black text-sm py-2.5 hover:bg-emerald-50 transition-colors active:scale-95"
              >
                Go Pay Now — I'll come back with screenshot
              </button>
            </div>

            {/* Payment Proof Upload - With Clear Requirements */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <label htmlFor="payment-proof" className="mb-2 block">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
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
                <span className="font-semibold">Tip:</span> Include your order reference in the transfer memo if possible. This helps us verify your payment even faster.
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600 shrink-0" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
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

        {/* Discount code input */}
        <div className="mt-3">
          {appliedCode ? (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-800">
                {appliedCode.code} — {appliedCode.description}
              </span>
              <button
                type="button"
                onClick={() => { setAppliedCode(null); setDiscountCodeInput(""); }}
                className="ml-2 text-xs font-bold text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCodeInput}
                  onChange={(e) => { setDiscountCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleApplyCode(); } }}
                  placeholder="Discount code"
                  maxLength={32}
                  className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                />
                <button
                  type="button"
                  onClick={() => void handleApplyCode()}
                  disabled={codeLoading || !discountCodeInput.trim()}
                  className="rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50 transition"
                >
                  {codeLoading ? "…" : "Apply"}
                </button>
              </div>
              {codeError && (
                <p className="text-xs font-semibold text-red-600">{codeError}</p>
              )}
            </div>
          )}
        </div>

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
                  {activeReward.tierName} ({activeReward.discountPercent}% off)
                </span>
                <span className="font-semibold">−GHS {totals.rewardDiscount.toFixed(2)}</span>
              </div>
            )}
            {dealsRewardApplied && dealsReward && totals.dealsDiscount > 0 && (
              <div className="mt-1 flex items-center justify-between text-violet-700">
                <span className="flex items-center gap-1 text-xs">
                  {dealsReward.label}
                </span>
                <span className="font-semibold">−GHS {totals.dealsDiscount.toFixed(2)}</span>
              </div>
            )}
            {appliedCode && totals.codeDiscount > 0 && (
              <div className="mt-1 flex items-center justify-between text-green-700">
                <span className="flex items-center gap-1 text-xs">
                  Code: {appliedCode.code}
                  <button
                    type="button"
                    onClick={() => { setAppliedCode(null); setDiscountCodeInput(""); }}
                    className="ml-1 text-red-500 hover:underline font-bold"
                  >
                    ✕
                  </button>
                </span>
                <span className="font-semibold">−GHS {totals.codeDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[var(--ink-soft)]">Delivery</span>
              <span className="font-semibold">
                {rewardApplied && activeReward?.freeShipping
                  ? "Free"
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
