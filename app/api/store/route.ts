import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";
import { supabaseAdmin } from "@/lib/supabase";
import type { Product } from "@/lib/site-content-types";

export async function GET() {
  const [content, vendorResult] = await Promise.all([
    getSiteContent(),
    supabaseAdmin
      .from("vendor_products")
      .select("id, vendor_id, vendor_name, name, description, price, category, stock, image, images, videos, status, created_at")
      .or("status.eq.approved,status.is.null")
      .order("created_at", { ascending: false }),
  ]);

  // Map vendor products to the Product shape and merge with admin products
  const vendorProducts: Product[] = (vendorResult.data ?? []).map((vp) => ({
    id: vp.id as string,
    slug: `vendor-${vp.id as string}`,
    name: (vp.name as string) ?? "Vendor Product",
    category: (vp.category as string) ?? "Other Categories",
    description: (vp.description as string) ?? "",
    price: Number(vp.price) || 0,
    stock: Number(vp.stock) || 0,
    rating: 0,
    badge: "Vendor",
    vendorName: (vp.vendor_name as string) || undefined,
    image: vp.image as string | undefined ?? undefined,
    images: Array.isArray(vp.images) ? (vp.images as string[]) : undefined,
    videos: Array.isArray(vp.videos) ? (vp.videos as string[]) : undefined,
    dateAdded: vp.created_at as string | undefined ?? undefined,
  }));

  // Deduplicate: admin products take precedence over vendor products with same id
  const adminIds = new Set(content.products.map((p) => p.id));
  const newVendorProducts = vendorProducts.filter((vp) => !adminIds.has(vp.id));

  const merged = {
    ...content,
    products: [...content.products, ...newVendorProducts],
  };

  return NextResponse.json(merged, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}