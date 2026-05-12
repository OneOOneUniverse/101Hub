import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT_FIELDS =
  "id, vendor_id, vendor_name, name, description, price, category, stock, image, images, videos, status, created_at";

/** GET /api/public/vendor-products — returns all approved (or legacy null-status) vendor products */
export async function GET() {
  // Run two explicit queries to avoid .or() PostgREST NULL-handling issues
  const [approvedResult, nullResult] = await Promise.all([
    supabaseAdmin
      .from("vendor_products")
      .select(SELECT_FIELDS)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("vendor_products")
      .select(SELECT_FIELDS)
      .is("status", null)
      .order("created_at", { ascending: false }),
  ]);

  if (approvedResult.error) {
    console.error("[vendor-products] Supabase error:", approvedResult.error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const items = [
    ...(approvedResult.data ?? []),
    ...(nullResult.data ?? []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ items }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
