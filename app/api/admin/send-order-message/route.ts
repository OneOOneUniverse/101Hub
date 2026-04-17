import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyUser } from "@/lib/db-notifications";
import { sendOrderMessageEmail } from "@/lib/email";

type SendOrderMessagePayload = {
  orderRef?: string;
  message?: string;
  messageType?: string;
  isHighlighted?: boolean;
};

export async function POST(request: Request) {
  // Admin guard
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const adminCheck = await isCurrentUserAdmin();
  if (!adminCheck) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: SendOrderMessagePayload;
  try {
    body = (await request.json()) as SendOrderMessagePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const orderRef = body.orderRef?.trim();
  const message = body.message?.trim();
  const messageType = body.messageType ?? "custom";
  const isHighlighted = body.isHighlighted ?? false;

  if (!orderRef) {
    return NextResponse.json(
      { error: "orderRef is required." },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json(
      { error: "message is required." },
      { status: 400 }
    );
  }

  // Validate message type
  if (!["update", "milestone", "custom"].includes(messageType)) {
    return NextResponse.json(
      { error: "Invalid messageType. Must be 'update', 'milestone', or 'custom'." },
      { status: 400 }
    );
  }

  try {
    // Verify order exists
    const { data: orderExists, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, clerk_user_id, customer_email, customer_name")
      .eq("order_ref", orderRef)
      .single();

    if (orderError || !orderExists) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // Insert message
    const { data, error } = await supabaseAdmin
      .from("order_messages")
      .insert({
        order_ref: orderRef,
        message,
        message_type: messageType,
        is_highlighted: isHighlighted,
      })
      .select("id, order_ref, message, message_type, is_highlighted, created_at")
      .single();

    if (error) {
      console.error("[send-order-message] Supabase error:", error);
      return NextResponse.json(
        { error: "Could not send message." },
        { status: 500 }
      );
    }

    // Notify the customer about the new message
    const clerkId = orderExists.clerk_user_id as string | null;
    if (clerkId) {
      void notifyUser(
        clerkId,
        'message',
        '💬 New Message on Your Order',
        `Admin sent a message about order ${orderRef}: "${message.slice(0, 80)}${message.length > 80 ? '…' : ''}"`,
        { order_ref: orderRef, link: '/orders' },
      );
    }

    // Email the customer about the message
    const custEmail = orderExists.customer_email as string | null;
    const custName = orderExists.customer_name as string;
    if (custEmail) {
      void sendOrderMessageEmail(custEmail, custName, orderRef, message);
    }

    return NextResponse.json(
      {
        success: true,
        message: {
          id: data.id,
          orderRef: data.order_ref,
          message: data.message,
          messageType: data.message_type,
          isHighlighted: data.is_highlighted,
          createdAt: data.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[send-order-message] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send message." },
      { status: 500 }
    );
  }
}
