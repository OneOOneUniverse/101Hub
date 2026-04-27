import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Reviews | 101 Hub",
  description:
    "Read honest reviews from real 101 Hub customers. See what shoppers are saying about Ghana's trusted online store — gadgets, fashion, services & more.",
  openGraph: {
    title: "⭐ Customer Reviews | 101 Hub",
    description:
      "Real reviews from verified 101 Hub shoppers. See star ratings, feedback, and what people love about Ghana's premier online store.",
    type: "website",
    url: "https://www.101hub.shop/reviews",
    siteName: "101 Hub",
    images: [
      {
        url: "https://www.101hub.shop/img/log.png",
        width: 1200,
        height: 630,
        alt: "101 Hub — Customer Reviews",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "⭐ Customer Reviews | 101 Hub",
    description:
      "Real reviews from verified 101 Hub shoppers. Honest feedback from Ghana's trusted online store.",
    images: ["https://www.101hub.shop/img/log.png"],
  },
  alternates: {
    canonical: "https://www.101hub.shop/reviews",
  },
};

export default function ReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
