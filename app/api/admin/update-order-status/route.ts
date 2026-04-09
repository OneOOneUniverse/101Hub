import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/order-status";

type Payload = {
  orderRef?: string;
  status?: string;
};

// Admin-only transitions supported by this endpoint
const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: "in_transit",
  in_transit: "delivered",
  delivered: "completed",
};

export async function POST(request: Request) {
  const body = (await request.json()) as Payload;

  if (!body.orderRef || !body.status) {
    return NextResponse.json({ error: "orderRef and status are required" }, { status: 400 });
  }

  const newStatus = body.status as OrderStatus;

  // Fetch current status
  const { data: order, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("order_ref, order_status")
    .eq("order_ref", body.orderRef)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const currentStatus = order.order_status as OrderStatus;
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus];

  if (allowedNext !== newStatus) {
    return NextResponse.json(
      { error: `Cannot move order from '${currentStatus}' to '${newStatus}'.` },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      order_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("order_ref", body.orderRef)
    .eq("order_status", currentStatus); // extra guard

  if (updateError) {
    console.error("[update-order-status] Supabase update error:", updateError);
    return NextResponse.json({ error: "Could not update order status" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
