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
  title: "101Hub",
  description:
    "Shop gadgets and accessories, then request tech services like game installation.",
  icons: {
    icon: "/img/logo.png",
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
          <Sidebar />
          <LayoutWrapper>
            <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-3 sm:px-4 md:px-5 space-y-4 sm:space-y-6 md:space-y-8">{children}</main>
          </LayoutWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
// (removed duplicate markup)
