import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/** DELETE /api/admin/orders?orderRef=xxx — permanently delete an order */
export async function DELETE(request: NextRequest) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const orderRef = request.nextUrl.searchParams.get("orderRef");
  if (!orderRef) return NextResponse.json({ error: "orderRef is required." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("orders")
    .delete()
    .eq("order_ref", orderRef);

  if (error) return NextResponse.json({ error: "Failed to delete order." }, { status: 500 });

  return NextResponse.json({ success: true });
}
