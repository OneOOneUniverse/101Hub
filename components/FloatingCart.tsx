"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProductSummary = { id: string; name: string; price: number; stock: number };

type CartLine = { productId: string; qty: number };

const STORAGE_KEY = "101hub-cart";

function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export default function FloatingCart({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<CartLine[]>(() => readCart());
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLines(readCart());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || productsLoaded) {
      return;
    }

    let isActive = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", { cache: "force-cache" });
        const data = (await response.json()) as { items?: ProductSummary[] };

        if (!response.ok || !Array.isArray(data.items)) {
          return;
        }

        if (isActive) {
          setProducts(data.items);
          setProductsLoaded(true);
        }
      } catch {
        // Keep the cart functional even if product details fail to load.
      }
    }

    void loadProducts();

    return () => {
      isActive = false;
    };
  }, [isOpen, productsLoaded]);

  const details = useMemo(() => {
    const resolved = lines
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        if (!product) return null;
        return {
          product,
          qty: line.qty,
          lineTotal: product.price * line.qty,
        };
      })
      .filter(
        (item): item is { product: (typeof products)[number]; qty: number; lineTotal: number } =>
          item !== null
      );

    const subtotal = resolved.reduce((sum, item) => sum + item.lineTotal, 0);
    const delivery = subtotal > 250 ? 0 : subtotal > 0 ? 12 : 0;

    return {
      items: resolved,
      subtotal,
      delivery,
      total: subtotal + delivery,
    };
  }, [lines, products]);

  const removeLine = useCallback((productId: string) => {
    setLines((prev) => {
      const next = prev.filter((line) => line.productId !== productId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Emit event so cart badge updates
      window.dispatchEvent(new Event("101hub:cart-updated"));
      return next;
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setLines((prev) => {
      const next = prev
        .map((line) => (line.productId === productId ? { ...line, qty } : line))
        .filter((line) => line.qty > 0);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Emit event so cart badge updates
      window.dispatchEvent(new Event("101hub:cart-updated"));
      return next;
    });
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Cart Panel */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-sm z-50 flex flex-col bg-white shadow-2xl rounded-l-xl overflow-hidden sm:rounded-l-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 px-4 sm:px-6 py-4 bg-[var(--surface)]">
          <h2 className="text-lg font-black sm:text-xl">Shopping Cart</h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-black/10 transition"
            aria-label="Close cart"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {details.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <p className="text-sm text-[var(--ink-soft)]">Your cart is empty</p>
              <Link
                href="/products"
                onClick={onClose}
                className="mt-4 inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)] sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            details.items.map((item) => (
              <div
                key={item.product.id}
                className="rounded-lg border border-black/10 bg-white p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold sm:text-sm">{item.product.name}</h3>
                    <p className="text-xs text-[var(--ink-soft)]">GHS {item.product.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => removeLine(item.product.id)}
                    className="text-xs font-semibold text-red-600 hover:text-red-800 flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label htmlFor={`qty-${item.product.id}`} className="text-xs text-[var(--ink-soft)]">
                    Qty:
                  </label>
                  <input
                    id={`qty-${item.product.id}`}
                    type="number"
                    min={1}
                    max={item.product.stock}
                    value={item.qty}
                    onChange={(e) => updateQty(item.product.id, Number(e.target.value || 1))}
                    className="w-12 rounded-lg border border-black/15 px-2 py-1 text-xs"
                  />
                  <p className="ml-auto text-xs font-bold">GHS {item.lineTotal.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary & Actions */}
        {details.items.length > 0 && (
          <div className="border-t border-black/10 bg-[var(--surface)] px-4 sm:px-6 py-4 space-y-3">
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--ink-soft)]">Subtotal</span>
                <span className="font-semibold">GHS {details.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-soft)]">Delivery</span>
                <span className="font-semibold">
                  {details.delivery === 0 ? "Free" : `GHS ${details.delivery.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-black/10 pt-2 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-black">GHS {details.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 transition sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Continue Shopping
              </button>
              <Link
                href="/checkout"
                onClick={onClose}
                className="flex-1 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)] transition inline-flex items-center justify-center sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
