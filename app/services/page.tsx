"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { useStoreContent } from "@/lib/use-store-content";
import PaymentDetailsCard from "@/components/PaymentDetailsCard";

type ServiceResult = {
  success: boolean;
  ticketRef: string;
  message: string;
};

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <section className="panel p-4 sm:p-6">
          <h1 className="text-2xl font-black sm:text-3xl">Services</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">Loading services...</p>
        </section>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}

const DRAFT_KEY = "service-booking-draft";

function ServicesContent() {
  const { content, loading, error: contentError } = useStoreContent();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const services = useMemo(() => content?.services ?? [], [content?.services]);
  const [packageId, setPackageId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<ServiceResult | null>(null);
  const [step, setStep] = useState<"form" | "payment">("form");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [tierId, setTierId] = useState("");
  const [step1Error, setStep1Error] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const restoredRef = useRef(false);
  const selectedService = useMemo(() => services.find((s) => s.id === packageId), [services, packageId]);
  const selectedSub = useMemo(() => selectedService?.subServices?.find((s) => s.id === tierId) ?? null, [selectedService, tierId]);
  const effectivePrice = selectedSub?.price ?? selectedService?.price ?? 0;
  const MANUAL_PAYMENT_NUMBER = "+233 548656980";

  useEffect(() => {
    if (!packageId && services[0]?.id) {
      setPackageId(services[0].id);
    }
  }, [packageId, services]);

  useEffect(() => {
    setTierId("");
    setStep1Error("");
  }, [packageId]);

  // Restore saved draft once services are loaded
  useEffect(() => {
    if (!services.length || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved) as {
        packageId?: string; customerName?: string; phone?: string;
        issue?: string; preferredTime?: string; requestedDate?: string;
      };
      if (draft.packageId && services.find((s) => s.id === draft.packageId)) setPackageId(draft.packageId);
      if (draft.customerName) setCustomerName(draft.customerName);
      if (draft.phone) setPhone(draft.phone);
      if (draft.issue) setIssue(draft.issue);
      if (draft.preferredTime) setPreferredTime(draft.preferredTime);
      if (draft.requestedDate && draft.requestedDate >= new Date().toISOString().split("T")[0]) {
        setRequestedDate(draft.requestedDate);
      }
    } catch { /* ignore malformed data */ }
  }, [services]);

  // Persist draft to localStorage on every field change
  useEffect(() => {
    if (!customerName && !phone && !issue) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        packageId, customerName, phone, issue, preferredTime, requestedDate,
      }));
    } catch { /* ignore quota errors */ }
  }, [packageId, customerName, phone, issue, preferredTime, requestedDate]);

  // Handle ?contact=serviceId from detail page
  useEffect(() => {
    const contactId = searchParams.get("contact");
    if (contactId && services.length > 0) {
      const match = services.find((s) => s.id === contactId);
      if (match) {
        setPackageId(match.id);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    }
  }, [searchParams, services]);

  if (loading) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Services</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">Loading services...</p>
      </section>
    );
  }

  if (contentError || !content) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Services</h1>
        <p className="mt-2 text-sm text-red-600 sm:text-base">{contentError || "Could not load services."}</p>
      </section>
    );
  }

  if (!content.features.services) {
    return (
      <FeatureUnavailable
        title="Services Unavailable"
        description="The services section is currently turned off from the admin panel."
        actionHref="/products"
        actionLabel="Browse Products"
      />
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await doSubmit();
  }

  async function doSubmit() {
    if (!paymentProof) {
      setPaymentProofError("Payment screenshot is required.");
      return;
    }

    if (paymentProof.type && !paymentProof.type.startsWith("image/")) {
      setPaymentProofError("Only image files are accepted.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setPaymentProofError("");
    setCanRetry(false);

    try {
      const paymentProofBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(paymentProof);
      });

      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          customerName,
          phone,
          issue,
          preferredTime,
          requestedDate: requestedDate || undefined,
          paymentProof: paymentProofBase64,
          tierLabel: selectedSub?.name,
          confirmedAmount: effectivePrice,
        }),
      });
      const contentType = response.headers.get("content-type") || "";
      let data: ServiceResult & { error?: string };
      if (contentType.includes("application/json")) {
        data = (await response.json()) as ServiceResult & { error?: string };
      } else {
        setSubmitError("Server returned non-JSON response.");
        return;
      }

      if (!response.ok) {
        setSubmitError(data.error || "Could not submit service request.");
        return;
      }

      setResult(data);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setCustomerName("");
      setPhone("");
      setIssue("");
      setPreferredTime("");
      setRequestedDate("");
      setPackageId(services[0]?.id ?? "");
      setPaymentProof(null);
      setTierId("");
      setStep("form");
    } catch {
      setSubmitError("Network error. Please try again.");
      setCanRetry(true);
    } finally {
      setSubmitting(false);
    }
  }

  function onProceedToPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedService?.subServices?.length && !tierId) {
      setStep1Error("Please select a sub-service before continuing.");
      return;
    }
    setStep1Error("");
    setStep("payment");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  if (!services.length) {
    return (
      <FeatureUnavailable
        title="No Services Configured"
        description="Add at least one service package from the admin page to accept requests."
        actionHref="/admin"
        actionLabel="Open Admin"
      />
    );
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Expert Services</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">
          Professional setup, installation, and optimization services for your tech.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article key={service.id} className="product-card group">
            <div className="product-card__shine" />
            <div className="product-card__glow" />
            <div className="product-card__content flex flex-col h-full">
              {/* Service Image */}
              {service.image ? (
                <div className="relative mb-3 overflow-hidden rounded-lg border border-black/10 bg-cover bg-center h-40 group/image">
                  <div
                    className="w-full h-full"
                    style={{ backgroundImage: `url('${service.image}')` }}
                    role="img"
                    aria-label={`${service.name} service image`}
                  >
                    <span className="sr-only">{service.name} service image</span>
                  </div>
                  {/* Gallery Count Badge */}
                  {service.images && service.images.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                      📸 +{service.images.length}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative mb-3 overflow-hidden rounded-lg border border-black/10 bg-[var(--base-light)] h-40 flex items-center justify-center group/image">
                  <span className="text-3xl">🔧</span>
                  {/* Gallery Count Badge */}
                  {service.images && service.images.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                      📸 +{service.images.length}
                    </div>
                  )}
                </div>
              )}

              {/* Service Info */}
              <div className="flex-1 flex flex-col">
                <h2 className="text-sm font-bold sm:text-base mb-1">{service.name}</h2>
                <p className="text-xs text-[var(--ink-soft)] sm:text-sm line-clamp-2 mb-3">{service.details}</p>

                {/* Price and Turnaround */}
                <div className="flex items-center justify-between gap-2 mb-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-[var(--ink-soft)]">Turnaround</p>
                    <p className="font-semibold">{service.turnaround}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[var(--ink-soft)]">Price</p>
                    <p className="font-black text-[var(--brand-deep)]">₵{service.price.toFixed(2)}{service.priceMax && service.priceMax > service.price ? ` – ₵${service.priceMax.toFixed(2)}` : ""}</p>
                  </div>
                </div>

          {selectedService?.subServices && selectedService.subServices.length > 0 && (
            <div className="mb-3 text-xs py-2 px-2 bg-[var(--base-light)] rounded text-[var(--ink-soft)]">
              <p className="font-semibold">🔧 {selectedService.subServices.length} sub-service{selectedService.subServices.length > 1 ? "s" : ""} available</p>
            </div>
          )}

                {/* Provider Info Snippet */}
                {service.providerName && (
                  <div className="mb-3 text-xs py-2 px-2 bg-[var(--base-light)] rounded text-[var(--ink-soft)]">
                    <p className="font-semibold">👤 {service.providerName}</p>
                  </div>
                )}

                {/* CTA Button */}
                <Link
                  href={`/services/${service.id}`}
                  className="w-full rounded-lg border-2 border-[var(--brand-deep)] bg-[var(--brand-deep)] px-3 py-2 text-center text-xs font-bold text-white hover:bg-[var(--brand)] transition-colors mt-auto"
                >
                  View Details & Contact
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Request Service Form */}
      {result ? (
        <div className="form-styled space-y-3 p-4 sm:p-6">
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <p>✅ Ticket {result.ticketRef}: {result.message}</p>
            <p className="text-xs mt-1">We'll contact you shortly with next steps.</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
            <p>👤 Your request has been submitted! Watch your phone for updates.</p>
          </div>
        </div>
      ) : step === "form" ? (
        /* ── STEP 1: Service request details ── */
        <form ref={formRef} onSubmit={onProceedToPayment} className="form-styled space-y-3 sm:space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-deep)] text-white text-xs font-bold">1</span>
            <h2 className="text-xl font-black sm:text-2xl">Request a Service</h2>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">Fill out this form. You'll be taken to the payment step next.</p>

          <div>
            <label htmlFor="pkg" className="mb-1 block text-xs font-semibold sm:text-sm">Service Package</label>
            <select id="pkg" value={packageId} onChange={(e) => setPackageId(e.target.value)} className="input-styled text-sm">
              {services.map((item) => (
                <option key={item.id} value={item.id}>{item.name} — ₵{item.price.toFixed(2)}{item.priceMax && item.priceMax > item.price ? `–₵${item.priceMax.toFixed(2)}` : ""}</option>
              ))}
            </select>
          </div>

          {selectedService?.pricingNote && (
            <p className="text-xs text-[var(--ink-soft)] -mt-1">{selectedService.pricingNote}</p>
          )}

          {selectedService?.subServices && selectedService.subServices.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-semibold sm:text-sm">
                Select Sub-Service <span className="text-red-500">*</span>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedService.subServices.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => { setTierId(sub.id); setStep1Error(""); }}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      tierId === sub.id
                        ? "border-[var(--brand-deep)] bg-[var(--brand-deep)]/10 shadow-sm"
                        : "border-black/10 bg-white hover:border-[var(--brand-deep)]/40 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs font-bold leading-tight ${
                        tierId === sub.id ? "text-[var(--brand-deep)]" : "text-black"
                      }`}>{sub.name}</span>
                      <span className={`shrink-0 text-sm font-black ${
                        tierId === sub.id ? "text-[var(--brand-deep)]" : "text-[var(--brand-deep)]"
                      }`}>₵{sub.price.toFixed(2)}</span>
                    </div>
                    {sub.description && (
                      <p className="mt-1 text-xs text-[var(--ink-soft)] leading-snug">{sub.description}</p>
                    )}
                  </button>
                ))}
              </div>
              {step1Error && <p className="mt-1 text-xs font-semibold text-red-600">{step1Error}</p>}
            </div>
          )}

          <div>
            <label htmlFor="name" className="mb-1 block text-xs font-semibold sm:text-sm">Full Name</label>
            <input id="name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" className="input-styled text-sm" />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-xs font-semibold sm:text-sm">Phone Number</label>
            <input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 548656980" className="input-styled text-sm" />
          </div>

          <div>
            <label htmlFor="issue" className="mb-1 block text-xs font-semibold sm:text-sm">What do you need help with?</label>
            <textarea id="issue" required value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe the issue or what you need..." className="input-styled h-20 sm:h-24 text-sm" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="mb-1 block text-xs font-semibold sm:text-sm">Preferred Date</label>
              <input id="date" type="date" required value={requestedDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => setRequestedDate(e.target.value)} className="input-styled text-sm" />
            </div>
            <div>
              <label htmlFor="time" className="mb-1 block text-xs font-semibold sm:text-sm">Preferred Time</label>
              <select id="time" required value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className="input-styled text-sm">
                <option value="">-- Select a time --</option>
                <option value="Morning">🌅 Morning (8 AM – 12 PM)</option>
                <option value="Afternoon">☀️ Afternoon (12 PM – 4 PM)</option>
                <option value="Evening">🌙 Evening (4 PM – 8 PM)</option>
                <option value="Flexible">🔄 Flexible (Any time)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-styled rounded-full w-full">
            Proceed to Payment →
          </button>
        </form>
      ) : (
        /* ── STEP 2: Manual payment ── */
        <form ref={formRef} onSubmit={(e) => void onSubmit(e)} className="form-styled space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-deep)] text-white text-xs font-bold">2</span>
            <h2 className="text-xl font-black sm:text-2xl">Complete Payment</h2>
          </div>

          {/* Summary */}
          {selectedService && (
            <div className="rounded-lg border border-black/10 bg-[var(--base-light)] p-3 text-sm">
              <p className="font-semibold">{selectedService.name}</p>
              <p className="text-[var(--ink-soft)] text-xs mt-0.5">For: {customerName} · {phone}</p>
              <p className="font-black text-[var(--brand-deep)] text-base mt-1">Amount: ₵{effectivePrice.toFixed(2)}{selectedSub ? ` — ${selectedSub.name}` : ""}</p>
            </div>
          )}

          {/* Copyable payment details */}
          <PaymentDetailsCard
            title="Payment Account Details"
            fields={
              content?.manualPaymentDetails && content.manualPaymentDetails.length > 0
                ? content.manualPaymentDetails.filter((f) => f.value)
                : [
                    { label: "Transaction/Phone Number", value: MANUAL_PAYMENT_NUMBER, icon: "📱" },
                    { label: "Account Name", value: "101 Hub Technologies", icon: "👤" },
                    { label: "Bank Name", value: "MTN Mobile Money", icon: "🏦" },
                    { label: "Amount", value: `GHS ${effectivePrice.toFixed(2)}`, icon: "💰" },
                  ]
            }
          />

          {/* Step-by-step instructions */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-bold text-blue-900">📋 How to Pay</p>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Open Your Mobile Money / Bank App</p>
                <p className="text-xs text-blue-800">MTN Mobile Money, Vodafone Cash, or your bank app</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Send the Exact Amount</p>
                <p className="text-xs text-blue-800">Use the copy buttons above to copy the number and amount.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Take a Screenshot</p>
                <p className="text-xs text-blue-800">Capture the confirmation screen showing the amount, recipient number, and transaction status.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Upload Screenshot Below</p>
                <p className="text-xs text-blue-800">Use the upload field below to attach your proof of payment.</p>
              </div>
            </div>
          </div>

          {/* Screenshot upload */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <label htmlFor="payment-proof" className="mb-2 block">
              <span className="text-sm font-bold text-red-900">📸 Screenshot Upload Required <span className="text-red-600">*</span></span>
              <p className="text-xs text-red-800 mt-0.5">This is mandatory to verify your payment</p>
            </label>
            <div className="mb-3 p-3 bg-white rounded border border-red-200">
              <p className="text-xs font-semibold text-red-900 mb-1">✓ What We Need:</p>
              <ul className="text-xs text-red-800 space-y-1 ml-4 list-disc">
                <li>Screenshot of transfer confirmation screen</li>
                <li>Must show amount: <span className="font-bold">GHS {effectivePrice.toFixed(2)}</span></li>
                <li>Must show recipient: <span className="font-bold">{MANUAL_PAYMENT_NUMBER}</span></li>
                <li>Transaction reference or status visible</li>
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

          {submitError && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2">
              <p className="text-sm font-semibold text-red-600">❌ {submitError}</p>
              {canRetry && (
                <button
                  type="button"
                  onClick={() => void doSubmit()}
                  className="shrink-0 rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
                >
                  ↺ Retry
                </button>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="flex-1 rounded-full border-2 border-[var(--brand-deep)] px-4 py-2.5 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand-deep)] hover:text-white transition-colors"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-styled rounded-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}