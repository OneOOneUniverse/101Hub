"use client";

import { useState, useCallback } from "react";
import { emitCartUpdate } from "@/lib/use-cart-count";

const STORAGE_KEY = "101hub-cart";

type CartLine = {
  productId: string;
  qty: number;
  overridePrice?: number;
};

interface Props {
  productId: string;
  /** The fixed price for this store (may be lower than regular price). */
  storePrice: number;
  /** The normal product price — used to decide if an override is needed. */
  regularPrice: number;
}

export default function StoreAddToCart({ productId, storePrice, regularPrice }: Props) {
  const [added, setAdded] = useState(false);

  const handleAdd = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing: CartLine[] = raw ? (JSON.parse(raw) as CartLine[]) : [];
      const overridePrice = storePrice < regularPrice ? storePrice : undefined;

      const idx = existing.findIndex((l) => l.productId === productId);
      if (idx >= 0) {
        existing[idx] = {
          ...existing[idx],
          qty: existing[idx].qty + 1,
          ...(overridePrice !== undefined && { overridePrice }),
        };
      } else {
        existing.push({
          productId,
          qty: 1,
          ...(overridePrice !== undefined && { overridePrice }),
        });
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      emitCartUpdate();
      window.dispatchEvent(new Event("101hub:product-added"));

      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    } catch {
      // localStorage unavailable
    }
  }, [productId, storePrice, regularPrice]);

  return (
    <button
      onClick={handleAdd}
      className={`satc-btn${added ? " satc-btn--done" : ""}`}
      aria-label={added ? "Added to cart" : "Add to cart"}
    >
      {added ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Added
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Add to Cart
        </>
      )}

      <style jsx>{`
        .satc-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          width: 100%;
          justify-content: center;
          padding: 0.55rem 1rem;
          border: none;
          border-radius: 99px;
          background: var(--brand, #7c3aed);
          color: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.22s, transform 0.18s, box-shadow 0.22s;
          box-shadow: 0 2px 10px rgba(124, 58, 237, 0.22);
        }
        .satc-btn:hover {
          background: var(--brand-deep, #6d28d9);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
        }
        .satc-btn:active {
          transform: scale(0.97);
        }
        .satc-btn--done {
          background: #059669;
          box-shadow: 0 2px 10px rgba(5, 150, 105, 0.25);
        }
        .satc-btn--done:hover {
          background: #047857;
        }
      `}</style>
    </button>
  );
}
