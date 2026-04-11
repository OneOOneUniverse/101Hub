import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type UpdateDeliveryEstimatePayload = {
  orderRef?: string;
  estimatedDeliveryDate?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as UpdateDeliveryEstimatePayload;

  if (!body.orderRef) {
    return NextResponse.json({ error: "orderRef is required" }, { status: 400 });
  }

  if (!body.estimatedDeliveryDate) {
    return NextResponse.json({ error: "estimatedDeliveryDate is required" }, { status: 400 });
  }

  try {
    // Update order with delivery estimate in Supabase
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        estimated_delivery_date: body.estimatedDeliveryDate,
        updated_at: new Date().toISOString(),
      })
      .eq("order_ref", body.orderRef);

    if (updateError) {
      console.error("[update-order-delivery-estimate] Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Could not update delivery estimate" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Delivery estimate updated successfully", orderRef: body.orderRef },
      { status: 200 }
    );
  } catch (error) {
    console.error("[update-order-delivery-estimate] Error:", error);
    return NextResponse.json(
      { error: "Could not update delivery estimate" },
      { status: 500 }
    );
  }
}
