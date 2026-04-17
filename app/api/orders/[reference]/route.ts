import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderData } from "@/lib/order-status";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;

  if (!reference) {
    return NextResponse.json({ error: "Order reference required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("order_ref", reference)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order: OrderData = {
    orderRef: data.order_ref as string,
    customerName: data.customer_name as string,
    customerPhone: data.customer_phone as string,
    customerAddress: data.customer_address as string,
    customerEmail: data.customer_email as string,
    customerNote: data.customer_note as string,
    items: data.items as OrderData["items"],
    subtotal: data.subtotal as number,
    delivery: data.delivery as number,
    total: data.total as number,
    paymentMethod: data.payment_method as OrderData["paymentMethod"],
    paymentStatus: data.payment_status as OrderData["paymentStatus"],
    orderStatus: data.order_status as OrderData["orderStatus"],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string | undefined,
    estimatedDeliveryDate: data.estimated_delivery_date as string | undefined,
  };

  return NextResponse.json(order, { status: 200 });
}
