import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/** GET /api/admin/vendor-products — list all vendor products/services for review */
export async function GET(request: NextRequest) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const type = request.nextUrl.searchParams.get("type") ?? "products";
  const table = type === "services" ? "vendor_services" : "vendor_products";

  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch items." }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

/** PATCH /api/admin/vendor-products — approve or reject a vendor product/service */
export async function PATCH(request: NextRequest) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = (await request.json()) as {
    id?: string;
    type?: string;
    status?: string;
    adminNotes?: string;
  };

  const { id, type, status, adminNotes } = body;
  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required." }, { status: 400 });
  }
  if (!["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const table = type === "services" ? "vendor_services" : "vendor_products";

  const { error } = await supabaseAdmin
    .from(table)
    .update({
      status,
      admin_notes: typeof adminNotes === "string" ? adminNotes.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Failed to update item." }, { status: 500 });

  return NextResponse.json({ success: true });
}
