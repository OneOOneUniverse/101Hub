import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "order_ref, customer_name, customer_phone, customer_address, order_status, total, downpayment, created_at, updated_at, estimated_delivery_date"
    )
    .in("order_status", ["confirmed", "in_transit"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[active-orders] Supabase error:", error);
    return NextResponse.json({ error: "Could not load active orders" }, { status: 500 });
  }

  const orders = (data ?? []).map((row) => ({
    orderRef: row.order_ref as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    customerAddress: row.customer_address as string,
    orderStatus: row.order_status as string,
    total: row.total as number,
    downpayment: row.downpayment as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string | null,
    estimatedDeliveryDate: row.estimated_delivery_date as string | null | undefined,
  }));

  return NextResponse.json({ orders });
}
