import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import LayoutWrapper from "@/components/LayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "101Hub - Gadgets, Accessories & Tech Services | Shop Online",
  description:
    "Buy gadgets and tech accessories online. Request professional tech services like game installation, device setup, and repairs. Fast delivery and competitive prices.",
  keywords: ["gadgets", "electronics", "accessories", "tech services", "game installation", "device setup"],
  icons: {
    icon: "/img/logo.png",
  },
  openGraph: {
    title: "101Hub - Gadgets, Accessories & Tech Services",
    description: "Shop online for gadgets, accessories and professional tech services. Fast delivery guaranteed.",
    type: "website",
    locale: "en_US",
    siteName: "101Hub",
    images: [
      {
        url: "https://www.101hub.shop/img/logo.png",
        width: 1200,
        height: 630,
        alt: "101Hub - Your Tech Store",
      },
    ],
  },
  alternates: {
    canonical: "https://www.101hub.shop",
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-[var(--surface)] text-[var(--ink)]">
          <div className="relative flex min-h-screen flex-col overflow-x-hidden">
          <Sidebar />
          <LayoutWrapper>
            <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-3 sm:px-4 md:px-5 space-y-4 sm:space-y-6 md:space-y-8">{children}</main>
          </LayoutWrapper>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
// (removed duplicate markup)
