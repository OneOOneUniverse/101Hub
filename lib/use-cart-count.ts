"use client";

import { useEffect, useState } from "react";

type CartLine = { productId: string; qty: number };

const STORAGE_KEY = "101hub-cart";

export function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Read initial cart
    const readCart = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const lines = raw ? (JSON.parse(raw) as CartLine[]) : [];
        const total = lines.reduce((sum, line) => sum + line.qty, 0);
        setCount(total);
      } catch {
        setCount(0);
      }
    };

    readCart();

    // Listen for storage changes (when another tab updates)
    const handleStorageChange = () => readCart();
    window.addEventListener("storage", handleStorageChange);

    // Listen for custom cart updates
    const handleCartUpdate = () => readCart();
    window.addEventListener("101hub:cart-updated", handleCartUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("101hub:cart-updated", handleCartUpdate);
    };
  }, []);

  return count;
}

export function emitCartUpdate() {
  window.dispatchEvent(new Event("101hub:cart-updated"));
}
