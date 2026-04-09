import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/order-status";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;

  if (!reference) {
    return NextResponse.json({ error: "Order reference required" }, { status: 400 });
  }

  // Fetch current status
  const { data: order, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("order_ref, order_status")
    .eq("order_ref", reference)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const currentStatus = order.order_status as OrderStatus;

  if (currentStatus !== "in_transit") {
    return NextResponse.json(
      { error: "Order must be out for delivery before you can confirm receipt." },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      order_status: "delivered",
      updated_at: new Date().toISOString(),
    })
    .eq("order_ref", reference)
    .eq("order_status", "in_transit"); // extra guard

  if (updateError) {
    console.error("[confirm-delivery] Supabase update error:", updateError);
    return NextResponse.json({ error: "Could not update order status" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
