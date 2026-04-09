"use client";

import { useCartCount } from "@/lib/use-cart-count";

export default function CartBadge({ onClick }: { onClick: () => void }) {
  const count = useCartCount();

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full transition"
      aria-label={`Shopping cart with ${count} items`}
      title={`${count} item${count !== 1 ? "s" : ""} in cart`}
    >
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
        {count > 99 ? "99+" : count}
      </span>
    </button>
  );
}
