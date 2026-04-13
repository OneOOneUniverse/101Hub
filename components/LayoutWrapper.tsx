"use client";

import { useEffect, useState } from "react";
import GenNavbar from "@/components/GenNavbar";
import FloatingCart from "@/components/FloatingCart";
import NavSearch from "@/components/NavSearch";
import SiteFooter from "@/components/SiteFooter";
import { useCartCount } from "@/lib/use-cart-count";
import { useSyncBrowsingDataToProfile, useLoadUserBrowsingData } from "@/lib/use-sync-browsing-data";
import type { FooterContent } from "@/lib/site-content-types";

type StoreData = {
  features?: { cart?: boolean };
  storeName?: string;
  footerText?: string;
  footer?: FooterContent;
};

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = useCartCount();
  const [cartEnabled, setCartEnabled] = useState(true);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  
  // Load user's saved browsing data on mount if signed in
  useLoadUserBrowsingData();
  
  // Sync browsing data to user profile periodically if signed in
  useSyncBrowsingDataToProfile();

  useEffect(() => {
    let isActive = true;
    async function loadFeatures() {
      try {
        const response = await fetch("/api/store", { cache: "no-store" });
        const data = (await response.json()) as StoreData;
        if (isActive) {
          if (data.features) {
            setCartEnabled(data.features.cart ?? true);
          }
          setStoreData(data);
        }
      } catch {
        // keep defaults
      }
    }
    void loadFeatures();
    return () => { isActive = false; };
  }, []);

  // Listen for add-to-cart events and auto-open cart
  useEffect(() => {
    const handleCartAdded = () => {
      if (cartEnabled) setCartOpen(true);
    };
    window.addEventListener("101hub:product-added", handleCartAdded);
    return () => window.removeEventListener("101hub:product-added", handleCartAdded);
  }, [cartEnabled]);

  return (
    <>
      <header className="sticky top-0 z-20 bg-transparent">
        <GenNavbar onCartClick={cartEnabled ? () => setCartOpen(true) : undefined} />
        <div className="mt-2 max-w-6xl mx-auto px-3 sm:px-4 md:px-5">
          <NavSearch />
        </div>
      </header>
      {children}
      {/* Site footer */}
      <SiteFooter
        storeName={storeData?.storeName ?? "101Hub"}
        footerText={storeData?.footerText ?? ""}
        footer={storeData?.footer}
      />
      {/* Floating cart button — mobile only overlay */}
      {cartEnabled ? (
        <button
          className="fixed bottom-5 right-5 z-30 sm:hidden flex items-center justify-center w-14 h-14 rounded-full bg-[var(--brand)] shadow-xl text-white hover:bg-[var(--brand-deep)] active:scale-95 transition-transform"
          aria-label="Open shopping cart"
          onClick={() => setCartOpen(true)}
        >
          <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-black rounded-full border-2 border-white">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>
      ) : null}
      {cartEnabled ? (
        <FloatingCart
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
        />
      ) : null}
    </>
  );
}
