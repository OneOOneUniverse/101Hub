"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { useStoreContent } from "@/lib/use-store-content";

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
  const services = useMemo(() => content?.services ?? [], [content?.services]);

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
                <div className="relative mb-3 overflow-hidden rounded-lg border border-black/10 h-40">
                  <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                  {service.images && service.images.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                      +{service.images.length} photos
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative mb-3 overflow-hidden rounded-lg border border-black/10 bg-[var(--base-light)] h-40 flex items-center justify-center">
                  <span className="text-3xl text-[var(--ink-soft)]"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg></span>
                  {service.images && service.images.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                      +{service.images.length} photos
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 flex flex-col">
                <h2 className="text-sm font-bold sm:text-base mb-1">{service.name}</h2>
                <p className="text-xs text-[var(--ink-soft)] sm:text-sm line-clamp-2 mb-3">{service.details}</p>

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

                {service.providerName && (
                  <div className="mb-3 text-xs py-2 px-2 bg-[var(--base-light)] rounded text-[var(--ink-soft)]">
                    <p className="font-semibold">{service.providerName}</p>
                  </div>
                )}

                <div className="mt-auto flex gap-2">
                  <Link
                    href={`/services/${service.id}`}
                    className="flex-1 rounded-lg border-2 border-black/20 px-3 py-2 text-center text-xs font-bold text-[var(--ink)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/services/${service.id}/book`}
                    className="flex-1 rounded-lg border-2 border-[var(--brand-deep)] bg-[var(--brand-deep)] px-3 py-2 text-center text-xs font-bold text-white hover:bg-[var(--brand)] transition-colors"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

