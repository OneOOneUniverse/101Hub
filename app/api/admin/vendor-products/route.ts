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

/** PATCH /api/admin/vendor-products — approve/reject OR edit fields of a vendor product/service */
export async function PATCH(request: NextRequest) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = (await request.json()) as {
    id?: string;
    type?: string;
    // status update
    status?: string;
    adminNotes?: string;
    // field edits (admin can edit without resetting to pending)
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    stock?: number;
    image?: string | null;
    images?: string[];
    variants?: object[];
    turnaround?: string;
  };

  const { id, type } = body;
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const table = type === "services" ? "vendor_services" : "vendor_products";

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!["approved", "rejected", "pending"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status;
    update.admin_notes = typeof body.adminNotes === "string" ? body.adminNotes.trim() : null;
  }

  // Field edits — admin keeps existing status (no re-approval required)
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.description !== undefined) update.description = body.description.trim();
  if (body.price !== undefined) update.price = body.price;
  if (body.category !== undefined) update.category = body.category.trim();
  if (body.stock !== undefined) update.stock = body.stock;
  if ("image" in body) update.image = typeof body.image === "string" ? body.image.trim() || null : null;
  if (body.images !== undefined) update.images = body.images;
  if (body.variants !== undefined) update.variants = body.variants;
  if (body.turnaround !== undefined) update.turnaround = body.turnaround.trim();

  const { error } = await supabaseAdmin.from(table).update(update).eq("id", id);

  if (error) return NextResponse.json({ error: "Failed to update item." }, { status: 500 });

  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/vendor-products — delete a vendor product or service */
export async function DELETE(request: NextRequest) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const id = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type") ?? "products";
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const table = type === "services" ? "vendor_services" : "vendor_products";

  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);

  if (error) return NextResponse.json({ error: "Failed to delete item." }, { status: 500 });

  return NextResponse.json({ success: true });
}
