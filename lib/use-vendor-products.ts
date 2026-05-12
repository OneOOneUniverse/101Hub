"use client";

import { useEffect, useState } from "react";

export type VendorProduct = {
  id: string;
  vendor_id: string;
  vendor_name: string;
  name: string;
  description: string;
  price: number;
  category?: string;
  stock?: number;
  image?: string | null;
  images?: string[];
  videos?: string[];
  status: string;
  created_at: string;
};

const CACHE_TTL_MS = 60_000; // 1 minute

let cachedItems: VendorProduct[] | null = null;
let cachedAt = 0;
let pendingRequest: Promise<VendorProduct[]> | null = null;

async function loadVendorProducts(): Promise<VendorProduct[]> {
  const isFresh = cachedItems !== null && Date.now() - cachedAt < CACHE_TTL_MS;
  if (isFresh) return cachedItems!;

  if (!pendingRequest) {
    pendingRequest = fetch("/api/public/vendor-products")
      .then(async (r) => {
        const data = (await r.json()) as { items?: VendorProduct[] };
        cachedItems = data.items ?? [];
        cachedAt = Date.now();
        return cachedItems;
      })
      .catch(() => {
        cachedItems = cachedItems ?? [];
        return cachedItems;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }

  return pendingRequest;
}

export function useVendorProducts() {
  const [items, setItems] = useState<VendorProduct[]>(cachedItems ?? []);
  const [loading, setLoading] = useState(cachedItems === null);

  useEffect(() => {
    let active = true;
    if (cachedItems !== null) {
      setItems(cachedItems);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadVendorProducts().then((data) => {
      if (active) {
        setItems(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return { items, loading };
}

/** Returns a stable id→product map, refreshed once per TTL. */
export function useVendorProductsMap(): { map: Record<string, VendorProduct>; loading: boolean } {
  const { items, loading } = useVendorProducts();
  const map: Record<string, VendorProduct> = {};
  items.forEach((vp) => { map[vp.id] = vp; });
  return { map, loading };
}
