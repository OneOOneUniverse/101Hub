"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { useStoreContent } from "@/lib/use-store-content";

type ServiceResult = {
  success: boolean;
  ticketRef: string;
  message: string;
};

export default function ServicesPage() {
  const { content, loading, error: contentError } = useStoreContent();
  const services = useMemo(() => content?.services ?? [], [content?.services]);
  const [packageId, setPackageId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<ServiceResult | null>(null);

  useEffect(() => {
    if (!packageId && services[0]?.id) {
      setPackageId(services[0].id);
    }
  }, [packageId, services]);

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
      setIssue("");
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
    <div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-[1.15fr_1fr]">
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Services</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">
          Book setup, installation, and tune-up services.
        </p>

        <div className="mt-4 space-y-2 sm:space-y-3">
          {services.map((item) => (
            <article key={item.id} className="product-card">
              <div className="product-card__shine" />
              <div className="product-card__glow" />
              <div className="product-card__content">
                {item.image ? (
                  <div
                    className="h-24 overflow-hidden rounded-lg border border-black/10 bg-cover bg-center sm:h-32 md:h-36"
                    style={{ backgroundImage: `url('${item.image}')` }}
                    role="img"
                    aria-label={`${item.name} service image`}
                  >
                    <span className="sr-only">{item.name} service image</span>
                  </div>
                ) : (
                  <div className="product-card__image" aria-hidden="true" />
                )}
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold product-card__title sm:text-lg">{item.name}</h2>
                    <p className="text-xs text-[var(--ink-soft)] product-card__description sm:text-sm">{item.details}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-[var(--ink-soft)] sm:text-sm">{item.turnaround}</p>
                    <p className="text-base font-black product-card__price sm:text-lg">GHS {item.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <form onSubmit={onSubmit} className="panel space-y-3 sm:space-y-4 p-4 sm:p-6">
        <h2 className="text-xl font-black sm:text-2xl">Request a Service</h2>

        <div>
          <label htmlFor="pkg" className="mb-1 block text-xs font-semibold sm:text-sm">
            Service Package
          </label>
          <select
            id="pkg"
            value={packageId}
            onChange={(event) => setPackageId(event.target.value)}
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
          >
            {services.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
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
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
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
            className="h-20 sm:h-24 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="time" className="mb-1 block text-xs font-semibold sm:text-sm">
            Preferred Schedule (optional)
          </label>
          <input
            id="time"
            value={preferredTime}
            onChange={(event) => setPreferredTime(event.target.value)}
            className="w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>

        {submitError ? <p className="text-sm font-semibold text-red-600">{submitError}</p> : null}
        {result ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            Ticket {result.ticketRef}: {result.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
