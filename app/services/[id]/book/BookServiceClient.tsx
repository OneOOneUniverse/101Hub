"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { useStoreContent } from "@/lib/use-store-content";

type ServiceResult = {
  success: boolean;
  ticketRef: string;
  message: string;
};

const SERVICE_AUTOSAVE_KEY = "101hub-service-draft";

export default function BookServiceClient() {
  const params = useParams();
  const serviceId = params.id as string;

  const { content, loading, error: contentError } = useStoreContent();
  const services = useMemo(() => content?.services ?? [], [content?.services]);

  const [packageId, setPackageId] = useState(serviceId);
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
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
  const [paymentWaitingReturned, setPaymentWaitingReturned] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const selectedService = useMemo(() => services.find((s) => s.id === packageId) ?? null, [services, packageId]);
  const selectedSubService = useMemo(() => selectedService?.subServices?.find((s) => s.id === subServiceId) ?? null, [selectedService, subServiceId]);
  const selectedPrice = (selectedSubService?.price ?? selectedService?.price) ?? 0;

  // ── Restore draft on mount ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SERVICE_AUTOSAVE_KEY);
      if (!saved) return;
      const d = JSON.parse(saved) as Record<string, string>;
      // Only restore if draft is for the same service
      if (d.packageId && d.packageId !== serviceId) return;
      if (d.customerName) setCustomerName(d.customerName);
      if (d.customerEmail) setCustomerEmail(d.customerEmail);
      if (d.phone) setPhone(d.phone);
      if (d.issue) setIssue(d.issue);
      if (d.preferredTime) setPreferredTime(d.preferredTime);
      if (d.requestedDate) setRequestedDate(d.requestedDate);
      if (d.subServiceId) setSubServiceId(d.subServiceId);
      if (d.step === "2") setStep(2);
      if (d.wasWaiting === "true") {
        setStep(2);
        setIsWaitingForPayment(true);
        setPaymentWaitingReturned(true);
      }
      setDraftRestored(true);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Autosave all fields ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(
        SERVICE_AUTOSAVE_KEY,
        JSON.stringify({
          customerName,
          customerEmail,
          phone,
          issue,
          preferredTime,
          requestedDate,
          packageId,
          subServiceId,
          step: String(step),
          wasWaiting: isWaitingForPayment ? "true" : "false",
        })
      );
    } catch {}
  }, [customerName, customerEmail, phone, issue, preferredTime, requestedDate, packageId, subServiceId, step, isWaitingForPayment]);

  // ── Detect when user switches back from banking app ─────────────────────────
  useEffect(() => {
    if (!isWaitingForPayment) return;
    const handleVisibility = () => {
      if (!document.hidden) setPaymentWaitingReturned(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isWaitingForPayment]);

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
      setCustomerName("");
      setCustomerEmail("");
      setPhone("");
      setIssue("");
      setPreferredTime("");
      setRequestedDate("");
      setPaymentProof("");
      setStep(1);
      setSubServiceId("");
      setIsWaitingForPayment(false);
      setPaymentWaitingReturned(false);
      setDraftRestored(false);
      try { localStorage.removeItem(SERVICE_AUTOSAVE_KEY); } catch {}
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Book Service</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">Loading...</p>
      </section>
    );
  }

  if (contentError || !content) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Book Service</h1>
        <p className="mt-2 text-sm text-red-600">{contentError || "Could not load service data."}</p>
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

  if (!services.length) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Book Service</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">No services are currently available.</p>
        <Link href="/services" className="mt-4 inline-block text-sm text-[var(--brand)] font-bold hover:underline">← Back to Services</Link>
      </section>
    );
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <section className="panel space-y-5 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-xl">✓</span>
          <div>
            <h1 className="text-2xl font-black">Request Submitted!</h1>
            <p className="text-sm text-[var(--ink-soft)]">
              Ticket: <span className="font-mono font-semibold text-[var(--brand)]">{result.ticketRef}</span>
            </p>
          </div>
        </div>
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{result.message}</p>
        <p className="text-xs text-[var(--ink-soft)]">Check your email for a confirmation.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/services" className="flex-1 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] text-center">
            Back to Services
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* ── Waiting-for-payment overlay ─────────────────────────────────────── */}
      {isWaitingForPayment && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          {!paymentWaitingReturned ? (
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl space-y-5">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30 animate-ping" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">📲</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Waiting for you…</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Switch to your <span className="font-semibold text-emerald-700">MoMo or banking app</span>, send{" "}
                  <span className="font-black text-gray-900">₵{selectedPrice.toFixed(2)}</span>, and take a screenshot of the confirmation.
                </p>
              </div>
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <p className="text-xs text-gray-400">This page will update automatically when you return</p>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-xs text-emerald-700 font-semibold">Amount to send</p>
                <p className="text-2xl font-black text-emerald-800">₵{selectedPrice.toFixed(2)}</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsWaitingForPayment(false); setPaymentWaitingReturned(false); }}
                className="text-xs text-gray-400 underline hover:text-gray-600"
              >
                Cancel — go back to form
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl space-y-5">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">🎉</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Welcome back!</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Great — now upload your payment screenshot below and submit your request.
                  <br />
                  <span className="text-xs text-gray-400 mt-1 block">Your form details were saved while you were away.</span>
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-left space-y-1">
                <p className="text-xs font-bold text-blue-900">Checklist before submitting:</p>
                <ul className="text-xs text-blue-800 space-y-1 ml-3 list-disc">
                  <li>Screenshot shows <span className="font-semibold">₵{selectedPrice.toFixed(2)}</span></li>
                  <li>Recipient number is visible</li>
                  <li>Transaction status / reference visible</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setIsWaitingForPayment(false)}
                className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 transition-colors active:scale-95"
              >
                📸 Upload Screenshot Now
              </button>
              <button
                type="button"
                onClick={() => { setIsWaitingForPayment(false); setPaymentWaitingReturned(false); }}
                className="text-xs text-gray-400 underline hover:text-gray-600"
              >
                Not done yet — go back to form
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Draft-restored banner ────────────────────────────────────────────── */}
      {draftRestored && !isWaitingForPayment && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800 font-semibold">💾 Your form was restored from where you left off.</p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(SERVICE_AUTOSAVE_KEY);
              setDraftRestored(false);
              setCustomerName(""); setCustomerEmail(""); setPhone(""); setIssue("");
              setPreferredTime(""); setRequestedDate(""); setSubServiceId("");
              setStep(1);
            }}
            className="shrink-0 text-xs text-amber-700 underline hover:text-amber-900"
          >
            Clear &amp; start over
          </button>
        </div>
      )}

      {/* ── Back link ────────────────────────────────────────────────────────── */}
      <Link
        href={`/services/${serviceId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--brand)] font-bold hover:underline"
      >
        ← Back to Service Details
      </Link>

      {/* ── Multi-step form ───────────────────────────────────────────────────── */}
      <div className="form-styled space-y-0 overflow-hidden p-0">
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
              <input id="name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" className="input-styled text-sm" />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-semibold sm:text-sm">Email Address</label>
              <input id="email" type="email" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="you@example.com" className="input-styled text-sm" />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="mb-1 block text-xs font-semibold sm:text-sm">Phone Number</label>
              <input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 548656980" className="input-styled text-sm" />
            </div>

            {/* Issue */}
            <div>
              <label htmlFor="issue" className="mb-1 block text-xs font-semibold sm:text-sm">What do you need help with?</label>
              <textarea id="issue" required value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe the issue or what you need..." className="input-styled h-20 sm:h-24 text-sm" />
            </div>

            {/* Date + Time */}
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

            {submitError && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg">❌ {submitError}</p>
            )}
          </div>
        )}

        {/* ─── STEP 2: Payment + Proof ──────────────────── */}
        {step === 2 && (
          <form onSubmit={onSubmit} className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { setStep(1); setSubmitError(""); }} className="text-xs text-[var(--brand)] font-bold hover:underline">
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

            {/* Fallback: manual payment details */}
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

            {/* Go Pay Now CTA */}
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-md">
              <p className="text-sm font-bold mb-1">Ready to pay? 💸</p>
              <p className="text-xs text-emerald-100 mb-3">
                Open your banking / MoMo app, send{" "}
                <span className="font-black">₵{selectedPrice.toFixed(2)}</span>, take a screenshot, then come back here to upload it.
              </p>
              <button
                type="button"
                onClick={() => { setIsWaitingForPayment(true); setPaymentWaitingReturned(false); }}
                className="w-full rounded-full bg-white text-emerald-700 font-black text-sm py-2.5 hover:bg-emerald-50 transition-colors active:scale-95"
              >
                🚀 Go Pay Now — I'll come back with screenshot
              </button>
            </div>

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
                  <img src={paymentProof} alt="Payment proof preview" className="max-h-48 rounded-lg border border-[var(--border)] object-contain" />
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

            {submitError && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg">❌ {submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !paymentProof}
              className="btn-styled rounded-full w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Service Request"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
