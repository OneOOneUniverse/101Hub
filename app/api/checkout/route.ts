import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSiteContent } from "@/lib/site-content";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyAdmins, notifyUser } from "@/lib/db-notifications";
import { sendOrderEmails } from "@/lib/email";

async function brevoUpsertContact(email: string, name: string, phone: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID ?? 1);

  if (!apiKey || apiKey === "your-brevo-api-key-here") return;

  const [firstName, ...rest] = name.trim().split(" ");
  const lastName = rest.join(" ");

  await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: firstName, LASTNAME: lastName, SMS: phone, SOURCE: "checkout" },
      listIds: [listId],
      updateEnabled: true,
    }),
  }).catch((err: unknown) => console.error("[checkout] Brevo upsert failed:", err));
}

type CheckoutPayload = {
  customerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: string;
  deliveryType?: string;
  note?: string;
  items?: Array<{ productId: string; qty: number }>;
  paymentMethod?: "paystack" | "manual";
  paymentProof?: string;
};

type OrderLine = { name: string; qty: number; unitPrice: number; lineTotal: number };

export async function POST(request: Request) {
  const { products, features, deliverySettings, paymentSettings } = await getSiteContent();
  const clerkUser = await currentUser().catch(() => null);
  let body: CheckoutPayload;

  try {
    body = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body.customerName || !body.email || !body.phone || !body.address || !body.items?.length) {
    return NextResponse.json(
      { error: "customerName, email, phone, address and items are required" },
      { status: 400 }
    );
  }

  if (!features.checkout || !features.cart) {
    return NextResponse.json({ error: "Checkout is currently unavailable" }, { status: 403 });
  }

  const paymentMethod = body.paymentMethod ?? "paystack";
  // Validate payment method is enabled
  if (paymentMethod === "paystack" && !(paymentSettings?.paystackEnabled ?? true)) {
    return NextResponse.json({ error: "Paystack payments are currently unavailable" }, { status: 403 });
  }
  if (paymentMethod === "manual" && !(paymentSettings?.manualEnabled ?? true)) {
    return NextResponse.json({ error: "Manual transfer payments are currently unavailable" }, { status: 403 });
  }

  let subtotal = 0;
  const lines: OrderLine[] = [];

  for (const line of body.items) {
    if (!line.productId || line.qty < 1) {
      return NextResponse.json({ error: "Invalid cart line" }, { status: 400 });
    }

    const product = products.find((item) => item.id === line.productId);

    if (!product) {
      return NextResponse.json(
        { error: `Unknown product: ${line.productId}` },
        { status: 404 }
      );
    }

    if (line.qty > product.stock) {
      return NextResponse.json(
        { error: `${product.name} has only ${product.stock} in stock` },
        { status: 400 }
      );
    }

    const lineTotal = product.price * line.qty;
    subtotal += lineTotal;
    lines.push({ name: product.name, qty: line.qty, unitPrice: product.price, lineTotal });
  }

  const delivery = (() => {
    const totalQty = body.items!.reduce((sum, l) => sum + l.qty, 0);
    if (subtotal === 0) return 0;
    if (totalQty >= deliverySettings.freeDeliveryItemThreshold) return 0;
    const allFree = lines.every((_, i) => {
      const product = products.find((p) => p.id === body.items![i]?.productId);
      return product?.noDeliveryFee === true;
    });
    if (allFree) return 0;
    // Delivery type overrides location-based fees
    if (body.deliveryType && (deliverySettings.deliveryTypes ?? []).length > 0) {
      const dt = deliverySettings.deliveryTypes.find((t) => t.id === body.deliveryType);
      return dt ? dt.fee : 0;
    }
    if (body.location) {
      const locFee = deliverySettings.locationFees.find((l) => l.id === body.location);
      return locFee ? locFee.fee : deliverySettings.defaultFee;
    }
    const productFees = lines.map((_, i) => {
      const product = products.find((p) => p.id === body.items![i]?.productId);
      if (product?.noDeliveryFee) return 0;
      return product?.deliveryFee ?? deliverySettings.defaultFee;
    });
    return Math.max(...productFees, 0);
  })();
  const processingFee = subtotal > 0 ? (deliverySettings.processingFee ?? 4) : 0;
  const total = subtotal + delivery + processingFee;
  const downpayment = total * 0.4;
  const orderRef = `GH-${Date.now()}`;
  const paymentStatus =
    paymentMethod === "paystack"
      ? "Payment processing via Paystack..."
      : "⏳ Awaiting admin verification";

  // Fire-and-forget — never block the response on email/SMS
  void sendOrderEmails({
    orderRef,
    customerName: body.customerName,
    customerEmail: body.email ?? "",
    phone: body.phone,
    address: body.address,
    note: body.note ?? "",
    lines,
    subtotal,
    delivery,
    processingFee,
    total,
    downpayment,
    paymentMethod,
    paymentStatus,
  });

  // Save order to Supabase (awaited so it completes before response)
  const { error: dbError } = await supabaseAdmin.from("orders").insert({
    order_ref: orderRef,
    customer_name: body.customerName,
    customer_email: body.email ?? "",
    customer_phone: body.phone,
    customer_address: body.address,
    customer_note: body.note ?? "",
    delivery_type: body.deliveryType ?? null,
    clerk_user_id: clerkUser?.id ?? null,
    items: lines,
    subtotal,
    delivery,
    processing_fee: processingFee,
    total,
    downpayment,
    payment_method: paymentMethod,
    payment_proof: body.paymentProof ?? null,
    payment_status: paymentMethod === "paystack" ? "verified" : "pending",
    order_status: paymentMethod === "paystack" ? "confirmed" : "payment_pending_admin_review",
  });

  if (dbError) {
    console.error("[checkout] Supabase insert failed:", dbError.message);
  }

  // Fire-and-forget: persistent notifications
  void notifyAdmins(
    'order',
    '📦 New Order Received',
    `${body.customerName} placed order ${orderRef} (GHS ${total.toFixed(2)}) — ${paymentMethod === 'manual' ? 'Awaiting payment verification' : 'Paid via Paystack'}`,
    { order_ref: orderRef, link: '/admin' },
  );

  // Notify the customer if they're signed in
  if (clerkUser?.id) {
    void notifyUser(
      clerkUser.id,
      'order',
      '🎉 Order Confirmed!',
      `Your order ${orderRef} has been received. We'll notify you when it's on its way!`,
      { order_ref: orderRef, link: '/orders' },
    );
  }

  // Fire-and-forget — add/update the customer in Brevo subscriber list
  if (body.email) {
    void brevoUpsertContact(body.email, body.customerName, body.phone);
  }

  return NextResponse.json(
    {
      success: true,
      orderRef,
      paymentMethod: paymentMethod === "paystack" ? "Paystack (Online)" : "Manual Transfer",
      customer: { name: body.customerName, phone: body.phone, address: body.address, note: body.note ?? "", deliveryType: body.deliveryType },
      lines,
      totals: { subtotal, delivery, processingFee, total, downpayment },
      storePhone: process.env.STORE_PHONE ?? "+233 548656980",
      storeEmail: process.env.STORE_EMAIL ?? "josephsakyi247@gmail.com",
      message: paymentMethod === "manual"
        ? "Order submitted! We will verify your payment and call you to confirm delivery."
        : "Order placed! Complete payment via Paystack.",
    },
    { status: 201 }
  );
}
