"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { useStoreContent } from "@/lib/use-store-content";

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

function ServicesContent() {
  const { content, loading, error: contentError } = useStoreContent();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const services = useMemo(() => content?.services ?? [], [content?.services]);
  const [packageId, setPackageId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [paymentProof, setPaymentProof] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<ServiceResult | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [subServiceId, setSubServiceId] = useState("");
  const selectedService = useMemo(() => services.find((s) => s.id === packageId) ?? null, [services, packageId]);
  const selectedSubService = useMemo(() => selectedService?.subServices?.find((s) => s.id === subServiceId) ?? null, [selectedService, subServiceId]);
  const selectedPrice = (selectedSubService?.price ?? selectedService?.price) ?? 0;

  useEffect(() => {
    if (!packageId && services[0]?.id) {
      setPackageId(services[0].id);
    }
  }, [packageId, services]);

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
    
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          customerName,
          customerEmail,
          phone,
          issue,
          preferredTime,
          requestedDate: requestedDate || undefined,
          paymentProof: paymentProof || undefined,
          tierLabel: selectedSubService?.name,
          confirmedAmount: selectedPrice || undefined,
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
      // Reset form after success
      setCustomerName("");
      setCustomerEmail("");
      setPhone("");
      setIssue("");
      setPreferredTime("");
      setRequestedDate("");
      setPackageId(services[0]?.id ?? "");
      setPaymentProof("");
      setStep(1);
      setSubServiceId("");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
                <div className="relative mb-3 overflow-hidden rounded-lg border border-black/10 h-40 group/image">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
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
                    <p className="font-black text-[var(--brand-deep)]">₵{service.price.toFixed(2)}</p>
                  </div>
                </div>

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

      {/* Multi-step request section */}
      <div ref={formRef} className="form-styled space-y-0 overflow-hidden p-0">
        {/* Step header */}
        <div className="flex items-center gap-0 border-b border-black/10">
          {(["1", "2"] as const).map((s, i) => {
            const active = step === (i + 1 as 1 | 2);
            const done = step > (i + 1);
            return (
              <div
                key={s}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${active ? "bg-[var(--brand)] text-white" : done ? "bg-[var(--brand)]/10 text-[var(--brand-deep)]" : "bg-white text-[var(--ink-soft)]"}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-black ${active ? "bg-white text-[var(--brand)]" : done ? "bg-[var(--brand)] text-white" : "bg-black/10 text-[var(--ink-soft)]"}`}>
                  {done ? "✓" : i + 1}
                </span>
                {i === 0 ? "Your Details" : "Payment & Proof"}
              </div>
            );
          })}
        </div>

        {/* ─── STEP 1: Details ─────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 p-4 sm:p-6">
            <h2 className="text-xl font-black sm:text-2xl">Request a Service</h2>
            <p className="text-sm text-[var(--ink-soft)]">
              Tell us what you need. We'll show you payment details on the next step.
            </p>

            {/* Package */}
            <div>
              <label htmlFor="pkg" className="mb-1 block text-xs font-semibold sm:text-sm">Service Package</label>
              <select
                id="pkg"
                value={packageId}
                onChange={(e) => { setPackageId(e.target.value); setSubServiceId(""); }}
                className="input-styled text-sm"
              >
                {services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.subServices?.length ? `from ₵${Math.min(...item.subServices.map((s) => s.price)).toFixed(2)}` : `₵${item.price.toFixed(2)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-service tier picker */}
            {selectedService?.subServices && selectedService.subServices.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-semibold sm:text-sm">Select Tier / Option</label>
                {selectedService.pricingNote && (
                  <p className="mb-2 text-xs text-[var(--ink-soft)]">{selectedService.pricingNote}</p>
                )}
                <div className="space-y-2">
                  {selectedService.subServices.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubServiceId(sub.id)}
                      className={`w-full flex items-start justify-between rounded-xl border-2 px-4 py-3 text-left text-sm transition ${subServiceId === sub.id ? "border-[var(--brand)] bg-[var(--brand)]/5" : "border-black/10 bg-white hover:border-[var(--brand)]/40"}`}
                    >
                      <div>
                        <p className="font-bold text-[var(--ink)]">{sub.name}</p>
                        {sub.description && <p className="text-xs text-[var(--ink-soft)] mt-0.5">{sub.description}</p>}
                      </div>
                      <span className={`ml-4 shrink-0 font-black ${subServiceId === sub.id ? "text-[var(--brand)]" : "text-[var(--brand-deep)]"}`}>
                        ₵{sub.price.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-semibold sm:text-sm">Full Name</label>
              <input
                id="name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Doe"
                className="input-styled text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-semibold sm:text-sm">Email Address</label>
              <input
                id="email"
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-styled text-sm"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="mb-1 block text-xs font-semibold sm:text-sm">Phone Number</label>
              <input
                id="phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233 548656980"
                className="input-styled text-sm"
              />
            </div>

            {/* Issue */}
            <div>
              <label htmlFor="issue" className="mb-1 block text-xs font-semibold sm:text-sm">What do you need help with?</label>
              <textarea
                id="issue"
                required
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Describe the issue or what you need..."
                className="input-styled h-20 sm:h-24 text-sm"
              />
            </div>

            {/* Date + Time */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="date" className="mb-1 block text-xs font-semibold sm:text-sm">Preferred Date</label>
                <input
                  id="date"
                  type="date"
                  required
                  value={requestedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="input-styled text-sm"
                />
              </div>
              <div>
                <label htmlFor="time" className="mb-1 block text-xs font-semibold sm:text-sm">Preferred Time</label>
                <select
                  id="time"
                  required
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="input-styled text-sm"
                >
                  <option value="">-- Select a time --</option>
                  <option value="Morning">🌅 Morning (8 AM – 12 PM)</option>
                  <option value="Afternoon">☀️ Afternoon (12 PM – 4 PM)</option>
                  <option value="Evening">🌙 Evening (4 PM – 8 PM)</option>
                  <option value="Flexible">🔄 Flexible (Any time)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!packageId || !customerName.trim() || !customerEmail.trim() || !phone.trim() || !issue.trim() || !requestedDate || !preferredTime) {
                  setSubmitError("Please fill in all fields before proceeding.");
                  return;
                }
                if (selectedService?.subServices?.length && !subServiceId) {
                  setSubmitError("Please select a service tier.");
                  return;
                }
                setSubmitError("");
                setStep(2);
              }}
              className="btn-styled rounded-full w-full"
            >
              Continue to Payment →
            </button>

            {submitError ? (
              <p className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                ❌ {submitError}
              </p>
            ) : null}
          </div>
        )}

        {/* ─── STEP 2: Payment + Proof ──────────────────── */}
        {step === 2 && (
          <form onSubmit={onSubmit} className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setSubmitError(""); }}
                className="text-xs text-[var(--brand)] font-bold hover:underline"
              >
                ← Back
              </button>
              <div>
                <h2 className="text-xl font-black sm:text-2xl">Make Payment</h2>
                <p className="text-sm text-[var(--ink-soft)]">Send the payment then upload your proof below.</p>
              </div>
            </div>

            {/* Amount to pay */}
            <div className="rounded-xl border-2 border-[var(--brand)] bg-[var(--brand)]/5 px-4 py-3 text-center">
              <p className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide">Amount to Pay</p>
              <p className="text-3xl font-black text-[var(--brand-deep)]">₵{selectedPrice.toFixed(2)}</p>
              <p className="text-xs text-[var(--ink-soft)] mt-0.5">{selectedSubService ? `${selectedService?.name} — ${selectedSubService.name}` : selectedService?.name}</p>
            </div>

            {/* Payment details from store */}
            {content?.providerPaymentDetails && (() => {
              const pd = content.providerPaymentDetails!;
              const providers: Array<{ key: keyof typeof pd; label: string; icon: string; color: string }> = [
                { key: "mtn", label: "MTN MoMo", icon: "🟡", color: "#fbbf24" },
                { key: "telecel", label: "Telecel Cash", icon: "🔴", color: "#ef4444" },
                { key: "at", label: "AirtelTigo Money", icon: "🔵", color: "#3b82f6" },
                { key: "bank", label: "Bank Transfer", icon: "🏦", color: "#6b7280" },
              ];
              const activeProviders = providers.filter((p) => pd[p.key] && pd[p.key]!.length > 0);
              if (!activeProviders.length) return null;
              return (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wide">Pay via</p>
                  {activeProviders.map((prov) => (
                    <div key={prov.key} className="rounded-xl border border-black/10 bg-white overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-black/5" style={{ background: `${prov.color}15` }}>
                        <span>{prov.icon}</span>
                        <p className="text-sm font-bold text-[var(--ink)]">{prov.label}</p>
                      </div>
                      <div className="divide-y divide-black/5">
                        {pd[prov.key]!.map((field, idx) => (
                          <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                            <p className="text-xs text-[var(--ink-soft)]">{field.icon} {field.label}</p>
                            <p className="text-sm font-bold text-[var(--ink)] select-all">{field.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Fallback: show manual payment details */}
            {!content?.providerPaymentDetails && content?.manualPaymentDetails && content.manualPaymentDetails.length > 0 && (
              <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
                <div className="px-4 py-2 border-b border-black/5 bg-[var(--base-light)]">
                  <p className="text-sm font-bold text-[var(--ink)]">💳 Payment Details</p>
                </div>
                <div className="divide-y divide-black/5">
                  {content.manualPaymentDetails.map((field, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                      <p className="text-xs text-[var(--ink-soft)]">{field.icon} {field.label}</p>
                      <p className="text-sm font-bold text-[var(--ink)] select-all">{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Proof Upload */}
            <div>
              <label htmlFor="payment_proof" className="mb-1 block text-xs font-semibold sm:text-sm">
                Payment Screenshot <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-[var(--ink-soft)]">
                After paying, upload a screenshot of your receipt or transaction confirmation.
              </p>
              {paymentProof ? (
                <div className="relative inline-block">
                  <img
                    src={paymentProof}
                    alt="Payment proof preview"
                    className="max-h-48 rounded-lg border border-[var(--border)] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setPaymentProof("")}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <input
                  id="payment_proof"
                  type="file"
                  accept="image/*"
                  required
                  className="input-styled text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setSubmitError("Image must be under 5 MB.");
                      e.target.value = "";
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setPaymentProof(ev.target?.result as string);
                      setSubmitError("");
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              )}
            </div>

            {submitError ? (
              <p className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                ❌ {submitError}
              </p>
            ) : null}

            {result ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 space-y-1">
                <p className="text-sm font-bold text-emerald-700">✅ Request submitted!</p>
                <p className="text-xs text-emerald-600">Ticket: <strong>{result.ticketRef}</strong> — {result.message}</p>
                <p className="text-xs text-emerald-600">Check your email for confirmation.</p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting || !paymentProof}
                className="btn-styled rounded-full w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Service Request"}
              </button>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
