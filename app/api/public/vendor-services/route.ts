import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/** GET /api/public/vendor-services — returns all approved vendor services for the services page */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("vendor_services")
    .select("id, vendor_id, vendor_name, name, description, price, turnaround, image, status, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ items: [] }, { status: 200 });

  return NextResponse.json({ items: data ?? [] }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
