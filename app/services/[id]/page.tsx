import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site-content";
import ServiceDetailClient from "./ServiceDetailClient";

type ServicePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { id } = await params;
  const content = await getSiteContent();
  const service = content.services?.find((s) => s.id === id);

  if (!service) {
    return { title: "Service Not Found | 101Hub" };
  }

  // Build price display string
  let priceDisplay = `₵${service.price.toFixed(2)}`;
  if (service.subServices && service.subServices.length > 0) {
    const prices = service.subServices.map((s) => s.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    priceDisplay = min !== max ? `₵${min.toFixed(2)} – ₵${max.toFixed(2)}` : `₵${min.toFixed(2)}`;
  } else if (service.priceMax && service.priceMax > service.price) {
    priceDisplay = `₵${service.price.toFixed(2)} – ₵${service.priceMax.toFixed(2)}`;
  }

  const description = `${service.name} — ${priceDisplay}. ${service.details.slice(0, 140)}${service.details.length > 140 ? "…" : ""} Book now at 101Hub.`;

  const ogImages = service.image
    ? [{ url: service.image, width: 1200, height: 900, alt: service.name }]
    : undefined;

  return {
    title: `${service.name} | 101Hub Services`,
    description,
    openGraph: {
      title: service.name,
      description,
      type: "website",
      url: `/services/${id}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: service.name,
      description,
      images: service.image ? [service.image] : undefined,
    },
  };
}

export default function ServiceDetailPage() {
  return <ServiceDetailClient />;
}

