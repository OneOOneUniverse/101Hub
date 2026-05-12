import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyUser } from "@/lib/db-notifications";
import { sendPaymentVerifiedEmail, sendPaymentRejectedEmail } from "@/lib/email";

type VerifyPaymentPayload = {
  orderRef?: string;
  action?: "approve" | "reject";
  reason?: string;
  estimatedDeliveryDate?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyPaymentPayload;

  if (!body.orderRef || !body.action) {
    return NextResponse.json({ error: "orderRef and action are required" }, { status: 400 });
  }

  if (!["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  try {
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("customer_email, customer_name, customer_phone, order_ref, total, clerk_user_id, items")
      .eq("order_ref", body.orderRef)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updates =
      body.action === "approve"
        ? { 
            payment_status: "verified", 
            order_status: "confirmed", 
            updated_at: new Date().toISOString(),
            ...(body.estimatedDeliveryDate && { estimated_delivery_date: body.estimatedDeliveryDate })
          }
        : { payment_status: "rejected", order_status: "payment_rejected", updated_at: new Date().toISOString() };

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updates)
      .eq("order_ref", body.orderRef);

    if (updateError) {
      console.error("[verify-payment] Supabase update error:", updateError);
      return NextResponse.json({ error: "Could not update order status" }, { status: 500 });
    }

    // ── Reduce product stock when payment is approved ──
    if (body.action === 'approve') {
      void (async () => {
        try {
          type StoredOrderLine = { productId?: string; qty: number; isVendorProduct?: boolean };
          const orderItems = (order.items as StoredOrderLine[] ?? []).filter((i) => i.productId && i.qty > 0);

          const vendorItems = orderItems.filter((i) => i.isVendorProduct);
          const adminItems = orderItems.filter((i) => !i.isVendorProduct);

          // Reduce vendor product stock
          for (const item of vendorItems) {
            const { data: vp } = await supabaseAdmin
              .from("vendor_products")
              .select("stock")
              .eq("id", item.productId!)
              .single();
            if (vp) {
              await supabaseAdmin
                .from("vendor_products")
                .update({ stock: Math.max(0, (Number(vp.stock) || 0) - item.qty), updated_at: new Date().toISOString() })
                .eq("id", item.productId!);
            }
          }

          // Reduce admin product stock via site-content
          if (adminItems.length > 0) {
            const { getSiteContent } = await import("@/lib/site-content");
            const { saveSiteContentToDb } = await import("@/lib/site-content-db");
            const content = await getSiteContent();
            const updatedProducts = content.products.map((p) => {
              const item = adminItems.find((i) => i.productId === p.id);
              return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
            });
            await saveSiteContentToDb({ ...content, products: updatedProducts });
          }
        } catch (e) {
          console.error('[verify-payment] stock reduction failed:', e);
        }
      })();
    }

    const customerEmail = order.customer_email as string;
    const customerName = order.customer_name as string;
    const orderRef = order.order_ref as string;

    // Fire-and-forget emails using the centralized email service
    if (customerEmail) {
      if (body.action === "approve") {
        void sendPaymentVerifiedEmail(customerEmail, customerName, orderRef);
      } else {
        void sendPaymentRejectedEmail(customerEmail, customerName, orderRef, body.reason);
      }
    }

    // Persistent notification for the customer
    const clerkId = order.clerk_user_id as string | null;
    if (clerkId) {
      try {
        if (body.action === 'approve') {
          await notifyUser(
            clerkId,
            'payment',
            'Payment Verified!',
            `Your payment for order ${orderRef} has been confirmed. We're preparing your order!`,
            { order_ref: orderRef, link: '/orders' },
          );
        } else {
          await notifyUser(
            clerkId,
            'payment',
            'Payment Issue',
            `We couldn't verify your payment for order ${orderRef}.${body.reason ? ` Reason: ${body.reason}` : ''} Please contact us.`,
            { order_ref: orderRef, link: '/orders' },
          );
        }
      } catch (e) { console.error('[verify-payment] notifyUser failed:', e); }
    }

    return NextResponse.json(
      { success: true, message: `Payment ${body.action}d successfully`, orderRef: body.orderRef },
      { status: 200 }
    );
  } catch (error) {
    console.error("[verify-payment] Error:", error);
    return NextResponse.json({ error: "Could not process payment verification" }, { status: 500 });
  }
}

