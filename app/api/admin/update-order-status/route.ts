import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyUser } from "@/lib/db-notifications";
import { sendOrderStatusEmail } from "@/lib/email";
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
    .select("order_ref, order_status, clerk_user_id, customer_name, customer_email")
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

  // Notify the customer about status change
  const clerkId = order.clerk_user_id as string | null;
  const customerEmail = order.customer_email as string | null;
  const customerName = order.customer_name as string;

  if (clerkId) {
    const statusLabels: Record<string, string> = {
      in_transit: '🚚 Your order is on the way!',
      delivered: '📬 Your order has been delivered!',
      completed: '✅ Your order is complete!',
    };
    const statusMessages: Record<string, string> = {
      in_transit: `Order ${body.orderRef} is now in transit. Keep an eye out for your delivery!`,
      delivered: `Order ${body.orderRef} has been delivered. Enjoy your purchase!`,
      completed: `Order ${body.orderRef} is now marked complete. Thank you for shopping with us!`,
    };
    void notifyUser(
      clerkId,
      'status_update',
      statusLabels[newStatus] ?? `Order status: ${newStatus}`,
      statusMessages[newStatus] ?? `Your order ${body.orderRef} status has been updated to ${newStatus}.`,
      { order_ref: body.orderRef, link: '/orders' },
    );
  }

  // Email the customer about the status change
  if (customerEmail) {
    void sendOrderStatusEmail(customerEmail, customerName, body.orderRef, newStatus);
  }

  return NextResponse.json({ success: true });
}
