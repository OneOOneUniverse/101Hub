"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useStoreContent } from "@/lib/use-store-content";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import ServiceShareButton from "@/components/ServiceShareButton";

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params.id as string;

  const { content, loading, error: contentError } = useStoreContent();

  const service = content?.services?.find((s) => s.id === serviceId);

  if (loading) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Service Details</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">Loading service...</p>
      </section>
    );
  }

  if (contentError || !content) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Service Details</h1>
        <p className="mt-2 text-sm text-red-600 sm:text-base">{contentError || "Could not load service."}</p>
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

  if (!service) {
    return (
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Service Not Found</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">
          We couldn't find the service you're looking for.
        </p>
        <Link href="/services" className="mt-4 inline-block text-sm text-[var(--brand)] font-bold hover:underline">
          ← Back to Services
        </Link>
      </section>
    );
  }

  return (
    <section className="panel space-y-6 p-4 sm:p-6">
      {/* Back Link */}
      <Link
        href="/services"
        className="inline-flex items-center gap-2 text-sm text-[var(--brand)] font-bold hover:underline"
      >
        ← Back to Services
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Service Image and Basic Info */}
        <div className="space-y-4">
          {service.image && (
            <div className="rounded-lg overflow-hidden bg-[var(--base-light)]">
              <img
                src={service.image}
                alt={service.name}
                className="w-full h-auto object-cover aspect-square"
              />
            </div>
          )}

          {/* Service Gallery */}
          {service.images && service.images.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wide">Gallery</p>
              <div className="grid grid-cols-3 gap-2">
                {service.images.map((img, idx) => (
                  <div
                    key={`${img}-${idx}`}
                    className="rounded-lg overflow-hidden bg-[var(--base-light)] aspect-square"
                  >
                    <img
                      src={img}
                      alt={`${service.name} - Image ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Basic Details Card */}
          <div className="rounded-lg border border-black/10 bg-white p-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wide">Service Name</p>
              <h1 className="text-2xl font-black text-black">{service.name}</h1>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wide">Price</p>
                {(() => {
                  if (service.subServices && service.subServices.length > 0) {
                    const prices = service.subServices.map((s) => s.price);
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    return (
                      <p className="text-lg font-black text-[var(--brand-deep)]">
                        {min !== max ? `₵${min.toFixed(2)} – ₵${max.toFixed(2)}` : `₵${min.toFixed(2)}`}
                      </p>
                    );
                  }
                  return (
                    <p className="text-lg font-black text-[var(--brand-deep)]">
                      ₵{service.price.toFixed(2)}{service.priceMax && service.priceMax > service.price ? ` – ₵${service.priceMax.toFixed(2)}` : ""}
                    </p>
                  );
                })()}
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wide">Turnaround</p>
                <p className="text-lg font-bold text-black">{service.turnaround}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details and Contact Info */}
        <div className="space-y-4">
          {/* Service Details */}
          <div className="rounded-lg border border-black/10 bg-white p-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wide">About This Service</p>
              <p className="text-sm text-black leading-relaxed mt-2">{service.details}</p>
            </div>
          </div>

          {/* Pricing Tiers */}
          {service.subServices && service.subServices.length > 0 && (
            <div className="rounded-lg border border-black/10 bg-white p-4 space-y-3">
              <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wide">Sub-Services & Pricing</p>
              {service.pricingNote && (
                <p className="text-xs text-[var(--ink-soft)]">{service.pricingNote}</p>
              )}
              <div className="divide-y divide-black/5">
                {service.subServices.map((sub) => (
                  <div key={sub.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-black">{sub.name}</span>
                      <span className="shrink-0 font-black text-[var(--brand-deep)]">₵{sub.price.toFixed(2)}</span>
                    </div>
                    {sub.description && (
                      <p className="mt-0.5 text-xs text-[var(--ink-soft)] leading-snug">{sub.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Offers */}
          {service.currentOffers && (
            <div className="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4 space-y-3">
              <div>
                <p className="text-xs font-bold text-[var(--brand-deep)] uppercase tracking-wide">🎯 Current Offer</p>
                <p className="text-sm font-bold text-black mt-2">{service.currentOffers}</p>
              </div>
            </div>
          )}

          {/* Provider Contact Details */}
          <div className="rounded-lg border border-black/10 bg-white p-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wide">Service Provider</p>
              {service.providerName && (
                <p className="text-lg font-black text-black mt-1">{service.providerName}</p>
              )}
            </div>

            <div className="space-y-2 border-t border-black/10 pt-3">
              {service.phone && (
                <a
                  href={`tel:${service.phone}`}
                  className="flex items-center gap-2 text-sm text-[var(--brand)] font-bold hover:underline break-all"
                >
                  <span>📞</span>
                  {service.phone}
                </a>
              )}
              {service.email && (
                <a
                  href={`mailto:${service.email}`}
                  className="flex items-center gap-2 text-sm text-[var(--brand)] font-bold hover:underline break-all"
                >
                  <span>✉️</span>
                  {service.email}
                </a>
              )}
            </div>

            {!service.phone && !service.email && (
              <p className="text-xs text-[var(--ink-soft)]">Contact details coming soon</p>
            )}
          </div>

          {/* CTA + Share */}
          <div className="flex gap-3">
            <a
              href={`/services?contact=${serviceId}`}
              className="flex-1 rounded-lg border-2 border-[var(--brand-deep)] bg-[var(--brand-deep)] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[var(--brand)] transition-colors"
            >
              Request This Service
            </a>
            <ServiceShareButton
              serviceId={serviceId}
              serviceName={service.name}
              serviceDetails={service.details}
              priceDisplay={(() => {
                if (service.subServices && service.subServices.length > 0) {
                  const prices = service.subServices.map((s) => s.price);
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);
                  return min !== max ? `₵${min.toFixed(2)} – ₵${max.toFixed(2)}` : `₵${min.toFixed(2)}`;
                }
                return service.priceMax && service.priceMax > service.price
                  ? `₵${service.price.toFixed(2)} – ₵${service.priceMax.toFixed(2)}`
                  : `₵${service.price.toFixed(2)}`;
              })()}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
