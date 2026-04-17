"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
          phone,
          issue,
          preferredTime,
          requestedDate: requestedDate || undefined,
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
      setPhone("");
      setIssue("");
      setPreferredTime("");
      setRequestedDate("");
      setPackageId(services[0]?.id ?? "");
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

      {/* Request Service Form */}
      <form ref={formRef} onSubmit={onSubmit} className="form-styled space-y-3 sm:space-y-4 p-4 sm:p-6">
        <h2 className="text-xl font-black sm:text-2xl">Request a Service</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Fill out this form to request one of our services. We'll be in touch within 24 hours.
        </p>

        <div>
          <label htmlFor="pkg" className="mb-1 block text-xs font-semibold sm:text-sm">
            Service Package
          </label>
          <select
            id="pkg"
            value={packageId}
            onChange={(event) => setPackageId(event.target.value)}
            className="input-styled text-sm"
          >
            {services.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — ₵{item.price.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-semibold sm:text-sm">
            Full Name
          </label>
          <input
            id="name"
            required
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="John Doe"
            className="input-styled text-sm"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-xs font-semibold sm:text-sm">
            Phone Number
          </label>
          <input
            id="phone"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+233 548656980"
            className="input-styled text-sm"
          />
        </div>

        <div>
          <label htmlFor="issue" className="mb-1 block text-xs font-semibold sm:text-sm">
            What do you need help with?
          </label>
          <textarea
            id="issue"
            required
            value={issue}
            onChange={(event) => setIssue(event.target.value)}
            placeholder="Describe the issue or what you need..."
            className="input-styled h-20 sm:h-24 text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="mb-1 block text-xs font-semibold sm:text-sm">
              Preferred Date
            </label>
            <input
              id="date"
              type="date"
              required
              value={requestedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(event) => setRequestedDate(event.target.value)}
              className="input-styled text-sm"
            />
          </div>

          <div>
            <label htmlFor="time" className="mb-1 block text-xs font-semibold sm:text-sm">
              Preferred Time
            </label>
            <select
              id="time"
              required
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
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

        {submitError ? (
          <p className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            ❌ {submitError}
          </p>
        ) : null}
        
        {result ? (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <p>✅ Ticket {result.ticketRef}: {result.message}</p>
            <p className="text-xs mt-1">We'll contact you shortly with next steps.</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn-styled rounded-lg text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Request Service"}
        </button>
      </form>
    </section>
  );
}
