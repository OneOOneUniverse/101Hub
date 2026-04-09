import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { canCancelOrder, type OrderStatus } from "@/lib/order-status";

const CANCELLABLE_STATUSES = ["payment_pending", "payment_pending_admin_review"];

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;

  if (!reference) {
    return NextResponse.json({ error: "Order reference required" }, { status: 400 });
  }

  // Fetch current order status
  const { data: order, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("order_ref, order_status")
    .eq("order_ref", reference)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const currentStatus = order.order_status as OrderStatus;

  if (!canCancelOrder(currentStatus)) {
    const stage =
      currentStatus === "confirmed" || currentStatus === "payment_verified"
        ? "already been confirmed"
        : currentStatus === "in_transit"
        ? "already out for delivery"
        : currentStatus === "delivered" || currentStatus === "completed"
        ? "already been delivered"
        : currentStatus === "cancelled"
        ? "already cancelled"
        : "past the cancellation stage";

    return NextResponse.json(
      {
        error: `This order cannot be cancelled — it has ${stage}. Please contact support.`,
        cancellable: false,
      },
      { status: 409 }
    );
  }

  // Update order to cancelled
  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      order_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("order_ref", reference)
    .in("order_status", CANCELLABLE_STATUSES); // extra guard: only cancel if still in right status

  if (updateError) {
    console.error("[cancel-order] Supabase update error:", updateError);
    return NextResponse.json({ error: "Could not cancel order" }, { status: 500 });
  }

  return NextResponse.json({ success: true, orderRef: reference }, { status: 200 });
}
