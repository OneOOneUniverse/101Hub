import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/** GET /api/public/vendor-products — returns all non-rejected vendor products for the store */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("vendor_products")
    .select("id, vendor_id, vendor_name, name, description, price, category, stock, image, images, videos, status, created_at")
    .or("status.neq.rejected,status.is.null")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ items: [] }, { status: 200 });

  return NextResponse.json({ items: data ?? [] }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
