import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import { NotificationProvider } from "@/components/NotificationProvider";
import SiteLoader from "@/components/SiteLoader";
import ReferralTracker from "@/components/ReferralTracker";
import ThemeProvider from "@/components/ThemeProvider";
import PWAInstallBanner from "@/components/PWAInstallBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "101 Hub - Shop Everything & Professional Services Ghana | Shop Online",
  description:
    "Welcome to 101 Hub, Ghana's premier online store. Shop everything from gadgets to fashion, home essentials, beauty products, and more. Get professional services: installation, setup, repairs. Fast delivery, best prices guaranteed.",
  keywords: [
    "101 hub",
    "101hub",
    "101 hub ghana",
    "101 hub shop",
    "101 hub asamankese",
    "online store ghana",
    "buy online ghana",
    "shop online",
    "electronics shop",
    "fashion ghana",
    "home essentials",
    "beauty products",
    "professional services",
    "device setup",
    "installation services",
    "ghana online store",
    "online shopping ghana",
    "affordable products",
    "asamankese shop",
    "asamankese store",
    "fast delivery ghana"
  ],
  icons: {
    icon: "/img/log.png",
  },
  openGraph: {
    title: "101 Hub - Shop Everything & Professional Services Ghana",
    description: "101 Hub: Your trusted online store in Ghana. Shop everything you need & get professional services. Fast delivery & competitive prices.",
    type: "website",
    locale: "en_US",
    siteName: "101 Hub",
    images: [
      {
        url: "https://www.101hub.shop/img/log.png",
        width: 1200,
        height: 630,
        alt: "101 Hub - Ghana's One-Stop Online Store",
      },
    ],
  },
  alternates: {
    canonical: "https://www.101hub.shop/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "101 Hub",
  "alternateName": "101Hub",
  "url": "https://www.101hub.shop",
  "logo": "https://www.101hub.shop/img/log.png",
  "image": "https://www.101hub.shop/img/log.png",
  "description": "101 Hub is Ghana's trusted online store. Shop everything from electronics and fashion to home essentials. Get professional services including installation, setup, and repairs.",
  "telephone": "+233548656980",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "First Stop",
    "addressLocality": "Asamankese",
    "addressCountry": "GH"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "5.8667",
    "longitude": "-0.6667"
  },
  "openingHours": "Mo-Su 00:00-23:59",
  "priceRange": "$$",
  "currenciesAccepted": "GHS",
  "paymentAccepted": "Cash, Mobile Money, Credit Card",
  "areaServed": {
    "@type": "Country",
    "name": "Ghana"
  },
  "sameAs": [
    "https://www.101hub.shop"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Products & Services",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Electronics & Gadgets" } },
      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Fashion & Accessories" } },
      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Home & Living" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Professional Services" } }
    ]
  }
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <head>
          {/* Resource hints — establish connections before they're needed */}
          <link rel="preconnect" href="https://res.cloudinary.com" />
          <link rel="dns-prefetch" href="https://res.cloudinary.com" />
          <link rel="preconnect" href="https://clerk.101hub.shop" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://accounts.clerk.dev" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/img/log.png" />
          <meta name="theme-color" content="#000000" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="101 Hub" />
          {/* Anti-flash: apply saved theme before first paint */}
          <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t||'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();` }} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body className="min-h-full flex flex-col bg-[var(--surface)] text-[var(--ink)]">
          <ThemeProvider>
          <SiteLoader />
          <PWAInstallBanner />
          <ReferralTracker />
          <NotificationProvider>
            <div className="relative flex min-h-screen flex-col overflow-x-hidden">
              <LayoutWrapper>
                <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-3 sm:px-4 md:px-5 space-y-4 sm:space-y-6 md:space-y-8">{children}</main>
              </LayoutWrapper>
            </div>
          </NotificationProvider>
          </ThemeProvider>
          <Script
            id="sw-register"
            strategy="afterInteractive"
          >{`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(() => {
                console.log('Service Worker registration failed');
              });
            }
          `}</Script>
        </body>
      </html>
    </ClerkProvider>
  );
}
// (removed duplicate markup)
