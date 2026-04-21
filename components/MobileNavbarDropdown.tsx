"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { useCartCount } from "@/lib/use-cart-count";

export default function MobileNavbarDropdown({
  features,
  userId,
  isAdmin,
  avatar,
  onCartClick,
}: any) {
  const [open, setOpen] = useState(false);
  const cartCount = useCartCount();

  return (
    <div className="flex items-center gap-2 sm:hidden">
      <div className="relative">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-2 text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 focus:outline-none"
          aria-label="Open navigation menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-44 rounded-lg border border-black/10 bg-white py-2 shadow-lg z-50">
            <nav className="flex flex-col gap-2 text-sm font-semibold text-[var(--ink-soft)]">
              <Link className="hover:text-[var(--brand-deep)] px-4 py-2" href="/products">Products</Link>
              {features.services ? (
                <Link className="hover:text-[var(--brand-deep)] px-4 py-2" href="/services">Services</Link>
              ) : null}
              <Link className="hover:text-[var(--brand-deep)] px-4 py-2" href="/orders">📦 Track Order</Link>
              <Link className="hover:text-[var(--brand-deep)] px-4 py-2" href="/reviews">⭐ Reviews</Link>
              {features.wishlist ? (
                <Link className="hover:text-[var(--brand-deep)] px-4 py-2" href="/wishlist">Wishlist</Link>
              ) : null}
              {features.checkout ? (
                <Link className="rounded-full bg-[var(--brand)] px-4 py-2 text-white hover:bg-[var(--brand-deep)] mx-2" href="/checkout">Checkout</Link>
              ) : null}
              {userId ? (
                <>
                  {isAdmin ? (
                    <Link className="hover:text-[var(--brand-deep)] px-4 py-2" href="/admin">Admin</Link>
                  ) : null}
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link className="hover:text-[var(--brand-deep)] px-4 py-2" href="/login">Login</Link>
                  <Link className="hover:text-[var(--brand-deep)] px-4 py-2" href="/signup">Sign Up</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
      {/* Cart badge always visible on mobile */}
      <button
        onClick={() => {
          onCartClick?.();
          setOpen(false);
        }}
        className="relative inline-flex items-center justify-center p-2 text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 rounded-full transition"
        aria-label={`Shopping cart with ${cartCount} items`}
        title={`${cartCount} item${cartCount !== 1 ? "s" : ""} in cart`}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        {cartCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </button>
      {/* Avatar always visible */}
      {userId ? (
        <button
          type="button"
          className="inline-flex items-center"
          aria-label="Open profile"
          title="Profile"
          onClick={() => window.location.href = '/profile'}
        >
          <Image
            src={avatar.src}
            alt={`${avatar.name} avatar`}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-black/15"
          />
        </button>
      ) : null}
    </div>
  );
}
